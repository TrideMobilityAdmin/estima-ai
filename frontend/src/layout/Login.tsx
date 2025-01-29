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
  // entityID,
  // roleID,
  // userID,
  // userToken,
  // getUserLogin_Url,
  // clearAuthState,
  // saveAuthData,
  // airportTrolleyImg,
} from "../constants/GlobalImports";
import flightBg  from '../../public/flightMaintenance.jpg'
import { Overlay } from "@mantine/core";

// const validCredentials = [
//   { email: "gmr@evrides.live", password: "gmr@evrides" },
//   { email: "admin@tridemobility.com", password: "admin" },
//   { email: "smarttrolley@evrides", password: "smarttrolley" },
// ];

type LoginInput = {
  email: string;
  password: string;
};

function Login() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    initialValues: { email: "", password: "" },
  });

  // const verify = (values: LoginInput) => {
  //   const isValid = validCredentials.some(
  //     (cred) => cred.email === values.email && cred.password === values.password
  //   );

  //   if (isValid) {
  //     navigate("/home/tracking");
  //   } else {
  //     setErrorMessage("Invalid email or password. Please try again.");
  //     form.reset(); // Clear the input fields
  //   }
  // };
  // useEffect(() => {
  //   if (errorMessage) {
  //     const timer = setTimeout(() => setErrorMessage(""), 5000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [errorMessage]);
  // const form = useForm<any>({
  //   initialValues: {
  //     email: "",
  //     password: "",
  //   },
  // });
  // const [token, setToken] = useAtom(userToken);
  // const [userId, setUserID] = useAtom(userID);
  // const [roleId, setRoleID] = useAtom(roleID);
  // const [entityId, setEntityID] = useAtom(entityID);
  // const login = async (values: LoginInput) => {
  //   try {
  //     const response = await axios.post(getUserLogin_Url, {
  //       email: values.email,
  //       password: values.password,
  //     });

  //     const { token, userID, roleID, entityID } = response.data;

  //     if (response.status === 200) {
  //       // Save user details and token
  //       setToken(token);
  //       setUserID(userID);
  //       setRoleID(roleID);
  //       setEntityID(entityID);

  //       sessionStorage.setItem("token", token);
  //       sessionStorage.setItem("userID", userID);
  //       sessionStorage.setItem("roleID", roleID);
  //       sessionStorage.setItem("entityID", entityID);

  //       saveAuthData({ token, status: "authenticated" });

  //       showNotification({
  //         title: "Login Successful",
  //         message: "Welcome to Smart Trolley dashboard",
  //         color: "green",
  //       });
  //       // Redirect to dashboard
  //       navigate("/home/tracking");
  //       window.location.reload();
  //     } else {
  //       throw new Error("Invalid credentials or server error");
  //     }
  //   } catch (error: any) {
  //     clearAuthState();
  //     console.log("errorrrrr", error);
  //     const errorMessage =
  //       error.response?.data?.responseMsg || "Something went wrong!";

  //     showNotification({
  //       title: "Login Failed",
  //       message: errorMessage,
  //       color: "red",
  //     });
  //   }
  // };

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
          background: "rgba(255, 255, 255, 0.3)",
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
            // onSubmit={form.onSubmit((values) => login(values))}
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
              label="Email address"
              placeholder="hello@gmail.com"
              size="md"
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              mt="md"
              size="md"
              {...form.getInputProps("password")}
            />
            <Checkbox label="Keep me logged in" mt="xl" size="md" />
            <Button onClick={()=>{ navigate("/home")}}  type="submit" bg="#000DB4" fullWidth mt="xl" size="md">
              Login
            </Button>
          </form>
        </Paper>
      </Flex>

      {errorMessage && (
        <Notification
          color="red"
          onClose={() => setErrorMessage("")}
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "400px",
          }}
        >
          {errorMessage}
        </Notification>
      )}
    </div>
  );
}

export default Login;
