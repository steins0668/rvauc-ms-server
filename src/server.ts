import { app } from "./app";
import { Enrollments } from "./features/enrollments";

const port = 2620; //  can be anything
app.listen(port, "0.0.0.0", async () => {
  //  the 0.0.0.0 is for hosting on your local ip
  console.log("Server is now running at port: " + port);

  const classSessionsJob = await Enrollments.Jobs.fillClassSessionsUntilToday();

  classSessionsJob.success
    ? console.log(
        `Success filling ${classSessionsJob.result.generated.inserted.length} class sessions`,
      )
    : console.error(
        `Failed filling class sessions due to: ${JSON.stringify(classSessionsJob.error)}`,
      );
});
