import { Flex,Space,Text } from "@mantine/core";
import EvRidesLogo from "../../public/EvRidesLogo.png";
import { useNavigate } from "react-router-dom";

export default function Footer(){
  const navigate = useNavigate();
    return (
        <>
        
        <Flex p={15} direction="row" justify="flex-end">
        <Text c={"gray"} fz={16}>
            poweredby
          </Text>
          <Space w={5}/>
        <div>
          <img
                // title="Logo"
                src={EvRidesLogo}
                style={{
                  height: "0.8em",
                  // width: "2em",
                  cursor: "pointer",
                  // paddingBottom: "6px",
                }}
                onClick={() => {
                  navigate("/home");
                }}
              />
          </div>
          
          
          
        </Flex>

        </>
    );
}