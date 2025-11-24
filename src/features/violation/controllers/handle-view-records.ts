import { Request, Response } from "express";
import { Enums } from "../../../data";
import { TxContext } from "../../../db/create-context";
import { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Services } from "../services";
import { Types } from "../types";

export async function handleViewRecords(req: Request, res: Response) {
  const {
    violationDataService,
    userDataService,
    auth,
    requestLogger: logger,
  } = req;

  const isAllowedPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!isAllowedPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `violation/view-records`."
    );

    return res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  const { payload } = auth;

  logger.log("info", "Attempting to retrieve records...");
  const resolution = await resolveRecords({
    violationDataService,
    userDataService,
    payload,
  });

  if (!resolution.success) {
    const { error } = resolution;
    const message = "Failed to get records. Please try again later.";

    logger.log("error", "Failed to get records.", error);
    return res
      .status(Errors.ViolationData.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("info", "Successfully retrieved records.");
  res.status(200).json({ success: true, result: resolution.result });
}

async function resolveRecords(args: {
  violationDataService: Services.ViolationData.Service;
  userDataService: Auth.Core.Services.UserData.Service;
  payload: Auth.Core.Schemas.Payloads.AccessToken.Full;
}) {
  const { violationDataService, userDataService, payload } = args;

  try {
    switch (payload.role) {
      case "student": {
        const resolver = recordsResolver["student"];
        return await resolver({
          violationDataService,
          userDataService,
          payload,
        });
      }
      default:
        return ResultBuilder.fail(
          new Errors.ViolationData.ErrorClass({
            name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
            message: "Role not implemented yet.",
          })
        );
    }
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ViolationData.normalizeError({
        name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
        message: "Failed to get records.",
        err,
      })
    );
  }
}

type StudentPayload = Extract<
  Auth.Core.Schemas.Payloads.AccessToken.Full,
  { role: "student" }
>;

type ProfessorPayload = Extract<
  Auth.Core.Schemas.Payloads.AccessToken.Full,
  { role: "professor" }
>;

const recordsResolver = {
  student: async (args: {
    violationDataService: Services.ViolationData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: StudentPayload;
  }) => {
    const { violationDataService, payload } = args;

    const queried = await fetchRecords({
      violationDataService,
      studentId: payload.id,
    });

    if (!queried.success) throw queried.error; //  ! propagate error

    const rawRecords = queried.result;
    const conversion = toDTORecord(rawRecords);

    return conversion;
  },

  professor: async (args: {
    violationDataService: Services.ViolationData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: ProfessorPayload;
  }) => [] as Types.Db.ViewModels.ViolationRecord[], //  todo: do this
};

async function fetchRecords(args: {
  tx?: TxContext;
  violationDataService: Services.ViolationData.Service;
  studentId: number;
}) {
  const { tx, violationDataService, studentId } = args;
  return await violationDataService.queryRecord({
    dbOrTx: tx,
    fn: async (query, converter) =>
      query.findMany({
        where: converter({ studentId }),
        orderBy: (records, { desc }) => [desc(records.date)],
        with: {
          status: true,
          student: {
            columns: { studentNumber: true, block: true, yearLevel: true },
            with: {
              user: {
                columns: { firstName: true, middleName: true, surname: true },
              },
              department: {
                columns: { name: true },
                with: { college: { columns: { name: true } } },
              },
            },
          },
        },
        limit: 6,
        columns: {
          studentId: false,
          complianceRecordId: false,
          statusId: false,
        },
      }),
  });
}

type FetchRecordsResult = Awaited<ReturnType<typeof fetchRecords>>;
type RawRecords = FetchRecordsResult extends
  | BaseResult.Fail<infer _>
  | BaseResult.Success<infer R>
  ? R
  : never;

function toDTORecord(
  rawRecords: RawRecords
):
  | Types.ViolationResult.Success<Schemas.ViolationData.RecordDTO[]>
  | Types.ViolationResult.Fail {
  try {
    const dtoRecord = rawRecords.map((record) => {
      //  * violation metadata
      const { id, date: isoDate } = record;
      const rawDate = new Date(isoDate);
      const date = isoDate.split("T")[0] as string;
      const day = Enums.Days[rawDate.getDay()] as string;
      const hours = rawDate.getHours().toString().padStart(2, "0");
      const minutes = rawDate.getMinutes().toString().padStart(2, "0");
      const time = hours + ":" + minutes; //  * hh:mm format
      const status = record.status.name;
      const reasons = record.reasons;

      //  * student metadata
      const { student } = record;
      const { studentNumber, block, yearLevel } = student;
      const department = student.department.name;
      const { surname, firstName, middleName } = student.user;

      const dto = {
        id,
        date,
        day,
        time,
        status,
        reasons,
        studentNumber,
        block,
        yearLevel,
        department,
        surname,
        firstName,
        middleName,
      };
      const parsed = Schemas.ViolationData.recordDTO.parse(dto);

      return parsed;
    });

    return ResultBuilder.success(dtoRecord);
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ViolationData.normalizeError({
        name: "VIOLATION_DATA_QUERY_RECORD_ERROR",
        message: "Failed converting records to DTO.",
        err,
      })
    );
  }
}
