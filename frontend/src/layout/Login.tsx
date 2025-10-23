import {
  Text,
  Title,
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Flex,
  Image,
  useState,
  useNavigate,
  useForm,
  useAtom,
  axios,
  showNotification,
  Space
} from "../constants/GlobalImports";
import flightBg from '../../public/airCraft8.jpg';
import { Overlay } from "@mantine/core";
import { userEmail, userID, userName, userToken, csrfToken } from "../api/tokenJotai";
import { clearAuthState, saveAuthData } from "../main";
import { getUserLogin_Url } from "../api/apiUrls";
import gmrIcon from "../../public/GMR_Icon2.png";

type LoginInput = {
  username: string;
  password: string;
};

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<any>({
    initialValues: {
      username: "",
      password: "",
    },
  });

  const [, setToken] = useAtom(userToken);
  const [, setUserID] = useAtom(userID);
  const [, setName] = useAtom(userName);
  const [, setEmail] = useAtom(userEmail);
  const [, setCsrfToken] = useAtom(csrfToken);

  const login = async (values: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await axios.post(getUserLogin_Url, {
        username: values.username,
        password: values.password,
      },{
        withCredentials: true,
      });

      const { 
        accessToken, 
        userID, 
        username,
        email
      } = response.data;

      // Extract CSRF token from response headers
      const csrfTokenFromHeaders = response.headers['x-csrf-token'] || 
                                  response.headers['X-CSRF-Token'] || 
                                  response.headers['X-Csrf-Token'];
      console.log("🔍 CSRF Token from Headers:", csrfTokenFromHeaders);
      console.log("🔍 All Response Headers:", response.headers);

      if (response.status === 200) {
        setToken(accessToken);
        setUserID(userID);
        setName(username);
        setEmail(email);
        if (csrfTokenFromHeaders) {
          setCsrfToken(csrfTokenFromHeaders);
        }

        const authData = { 
          token: accessToken, 
          userID, 
          username, 
          email,
          csrfToken: csrfTokenFromHeaders
        };

        // Console log what's being stored in storage
        console.log("🔐 Login Response Data:", {
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : "No token",
          userID,
          username,
          email,
          csrfTokenFromHeaders: csrfTokenFromHeaders ? `${csrfTokenFromHeaders.substring(0, 20)}...` : "No CSRF token"
        });

        console.log("💾 Storing in sessionStorage:", {
          token: accessToken ? `${accessToken.substring(0, 20)}...` : "No token",
          userID,
          username,
          email,
          csrfToken: csrfTokenFromHeaders ? `${csrfTokenFromHeaders.substring(0, 20)}...` : "No CSRF token"
        });

        saveAuthData(authData);

        showNotification({
          title: "Login Successful",
          message: "Welcome to EstimaAI",
          color: "green",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });

        setIsLoading(false);
        navigate("/home");
      } else {
        setIsLoading(false);
        throw new Error("Invalid credentials or server error");
      }
    } catch (error: any) {
      setIsLoading(false);
      clearAuthState();
      const errorMessage =
        error.response?.data?.detail || "Something went wrong!";

      showNotification({
        title: "Login Failed!",
        message: errorMessage,
        color: "red",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Background Image */}
      <Image
        src={flightBg}
        style={{
          height: "100vh",
          width: "100vw",
          objectFit: "cover",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      {/* Gradient Overlay */}
      <Overlay
        gradient="linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, .20) 60%)"
        opacity={1}
        zIndex={0}
      />

      {/* GMR Watermark - Top Right Corner with Subtitle */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "30px",
          textAlign: "center",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1.1,
        }}
      >
        <div
          style={{
            fontSize: "70px",
            color: "rgba(255, 255, 255, 0.3)",
            fontWeight: 900,
          }}
        >
          GMR
        </div>
        <div
          style={{
            fontSize: "30px",
            color: "rgba(255, 255, 255, 0.25)",
            fontWeight: 600,
          }}
        >
          Aero Technic
        </div>
      </div>


      {/* Login Card */}
      <Flex
        justify="center"
        align="center"
        style={{
          height: "100vh",
          width: "100vw",
          position: "relative",
          background: "rgba(0, 0, 0,0.1)",
          backdropFilter: "blur(2px)",
        }}
      >
        <Paper
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "30px",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <form onSubmit={form.onSubmit((values) => login(values))}>
            <Flex align="center" justify="center" direction="column">
              {/* Smaller GMR Icon */}
              <Image
                src={gmrIcon}
                alt="GMR Logo"
                style={{ width: 200, height: 200, marginBottom: 12 }} // smaller size
              />

              <Title ta="center">EstimaAI</Title>
              <Text>Intelligent RFQ Predictor</Text>
            </Flex>
            <Space h="20" />
            <TextInput
              label="Username"
              placeholder="hello@gmail.com"
              size="md"
              {...form.getInputProps("username")}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              mt="md"
              size="md"
              {...form.getInputProps("password")}
            />
            <Checkbox label="Keep me logged in" mt="xl" size="md" />
            <Button
              loading={isLoading}
              type="submit"
              bg="#000DB4"
              fullWidth
              mt="xl"
              size="md"
            >
              Login
            </Button>
          </form>
        </Paper>
      </Flex>
    </div>
  );
}

export default Login;
