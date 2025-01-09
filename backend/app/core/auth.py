import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from pymongo.errors import OperationFailure
from jose import JWTError, jwt

from app.models.user import UserInDB
from app.utils.database_connection import DatabaseConnection
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AuthError(Exception):
    """Custom exception for authentication-related errors"""
    pass

class AuthHandler:
    def __init__(self):
        """Initialize the authentication handler with necessary configurations"""
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.db = DatabaseConnection()
        
        # Validate configuration
        self._validate_config()

    def _validate_config(self) -> None:
        """Validate authentication configuration"""
        if not self.secret_key:
            logger.error("JWT secret key not configured")
            raise AuthError("JWT secret key must be configured")
        
        if len(self.secret_key) < 32:
            logger.warning("JWT secret key length is less than recommended")

    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password
            
        Returns:
            str: Hashed password
            
        Raises:
            AuthError: If password hashing fails
        """
        try:
            if not password or len(password) < 8:
                raise ValueError("Password must be at least 8 characters long")
                
            return self.pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Error hashing password: {str(e)}")
            raise AuthError("Password hashing failed")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password to compare against
            
        Returns:
            bool: True if password matches, False otherwise
            
        Raises:
            AuthError: If password verification fails
        """
        try:
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {str(e)}")
            raise AuthError("Password verification failed")

    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token.
        
        Args:
            data: Data to encode in the token
            expires_delta: Optional custom expiration time
            
        Returns:
            str: Encoded JWT token
            
        Raises:
            AuthError: If token creation fails
        """
        try:
            to_encode = data.copy()
            
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(
                    minutes=self.access_token_expire_minutes
                )
            
            to_encode.update({
                "exp": expire,
                "iat": datetime.utcnow(),
                "type": "access_token"
            })
            
            encoded_jwt = jwt.encode(
                to_encode,
                self.secret_key,
                algorithm=self.algorithm
            )
            
            logger.info(f"Created access token for user: {data.get('sub')}")
            return encoded_jwt
            
        except Exception as e:
            logger.error(f"Error creating access token: {str(e)}")
            raise AuthError("Token creation failed")

    def decode_access_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a JWT token.
        
        Args:
            token: JWT token to decode
            
        Returns:
            dict: Decoded token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Validate token type
            if payload.get("type") != "access_token":
                raise JWTError("Invalid token type")
                
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Attempt to use expired token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
            
        except jwt.JWTClaimsError:
            logger.warning("Invalid token claims")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims"
            )
            
        except jwt.JWTError:
            logger.warning("Invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
            
        except Exception as e:
            logger.error(f"Error decoding token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed"
            )

    async def get_user_from_token(self, token: str) -> UserInDB:
        """
        Get user details from a JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            UserInDB: User details
            
        Raises:
            HTTPException: If user not found or token invalid
        """
        try:
            payload = self.decode_access_token(token)
            username = payload.get("sub")
            
            if username is None:
                logger.warning("Token payload missing username")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
                
            user = await self._get_user_from_db(username)
            
            if user is None:
                logger.warning(f"User not found: {username}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
                
            return UserInDB(**user)
            
        except OperationFailure as e:
            logger.error(f"Database error fetching user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database operation failed"
            )
            
        except Exception as e:
            logger.error(f"Error getting user from token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

    async def _get_user_from_db(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user details from database.
        
        Args:
            username: Username to look up
            
        Returns:
            Optional[Dict[str, Any]]: User details if found
            
        Raises:
            OperationFailure: If database operation fails
        """
        try:
            user_collection = self.db.get_collection("gmr-mro", "users")
            return user_collection.find_one({"username": username})
            
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            raise OperationFailure(f"Database operation failed: {str(e)}")

# Create a singleton instance
auth_handler = AuthHandler()