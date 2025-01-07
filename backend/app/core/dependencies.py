from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.pyjwt.jwt import validate_token
from app.models.user import UserInDB

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Dependency to get current user from token
def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    username = validate_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = fake_users_db.get(username)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return UserInDB(**user)