import { app } from "./app";

const port = 2620; //  can be anything
app.listen(port, "0.0.0.0", () => {
  //  the 0.0.0.0 is for hosting on your local ip
  console.log("Server is now running at port: " + port);
});
