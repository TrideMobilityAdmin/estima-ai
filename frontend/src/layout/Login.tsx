import React from "react";
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
  Notification,
  useState,
  useNavigate,
  useForm,
  useAtom,
  axios,
  showNotification,
  Space
} from "../constants/GlobalImports";
import flightBg from '../../public/airCraft8.jpg'
import { Overlay } from "@mantine/core";
import { entityID, roleID, userEmail, userID, userName, userToken } from "../api/tokenJotai";
import { clearAuthState, saveAuthData } from "../main";
import { getUserLogin_Url } from "../api/apiUrls";

type LoginInput = {
  username: string;
  password: string;
};

function Login() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<any>({
    initialValues: {
      username: "",
      password: "",
    },
  });
  const [token, setToken] = useAtom(userToken);
  const [userId, setUserID] = useAtom(userID);
  const [name, setName] = useAtom(userName);
  const [email, setEmail] = useAtom(userEmail);
  // const [roleId, setRoleID] = useAtom(roleID);
  // const [entityId, setEntityID] = useAtom(entityID);
  
  const login = async (values: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await axios.post(getUserLogin_Url, {
        username: values.username,
        password: values.password,
      });

      const { 
        accessToken, 
        userID, 
        username,
        email
        // roleID, 
        // entityID 
      } = response.data;

      if (response.status === 200) {
        // Update Jotai atoms
        setToken(accessToken);
        setUserID(userID);
        setName(username);
        setEmail(email);
        // setRoleID(roleID);
        // setEntityID(entityID);

        // Save to sessionStorage using the helper function
        saveAuthData({ 
          token: accessToken, 
          userID, 
          username, 
          email 
        });

        // Verify that the token is stored
        console.log("✅ Token stored in sessionStorage:", accessToken.substring(0, 10) + "...");  
        console.log("✅ User stored in sessionStorage:", username);  
        console.log("✅ Email stored in sessionStorage:", email);  

        showNotification({
          title: "Login Successful",
          message: "Welcome to EstimaAI",
          color: "green",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
        
        setIsLoading(false);
        // Redirect to dashboard
        navigate("/home");
      } else {
        setIsLoading(false);
        throw new Error("Invalid credentials or server error");
      }
    } catch (error: any) {
      setIsLoading(false);
      clearAuthState();
      console.log("Error during login:", error);
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
       <Overlay
          gradient="linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, .20) 60%)"
          opacity={1}
          zIndex={0}
        />

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
          }}
        >
          <form
            onSubmit={form.onSubmit((values) => login(values))}
          >
            <Flex align='center' justify='center' direction='column'>
            <Title ta="center" >
              EstimaAI
            </Title>
            <Text>
            Intelligent RFQ Predictor
            </Text>
            </Flex>
            <Space h='50'/>
            
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
            <Button loading={isLoading} type="submit" bg="#000DB4" fullWidth mt="xl" size="md">
              Login
            </Button>
          </form>
        </Paper>
      </Flex>
    </div>
  );
}

export default Login;