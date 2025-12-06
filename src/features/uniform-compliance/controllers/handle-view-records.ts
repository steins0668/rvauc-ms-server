import { Request, Response } from "express";
import { execTransaction, TxContext } from "../../../db/create-context";
import { Enums } from "../../../data";
import { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { Auth } from "../../auth";
import { Errors } from "../errors";
import { Services } from "../services";
import { Types } from "../types";
import { Schemas } from "../schemas";
import { Data } from "../data";

export async function handleViewRecords(req: Request, res: Response) {
  const {
    complianceDataService,
    userDataService,
    auth,
    requestLogger: logger,
  } = req;

  const validPayload = Auth.Core.Utils.ensureAllowedPayload(auth, "full");

  if (!validPayload) {
    logger.log(
      "info",
      "Invalid payload attempted to access `uniform-compliance/view-records`."
    );

    return res.status(401).json({
      success: false,
      message: "You are not allowed to access this resource.",
    });
  }

  const { payload } = auth;

  logger.log("info", "Attempting to retrieve records...");
  const resolution = await resolveRecords({
    complianceDataService,
    userDataService,
    payload,
  });

  if (!resolution.success) {
    const { error } = resolution;

    logger.log("debug", "Failed to get records.", error);

    const message = "Failed to get records. Please try again later.";
    return res
      .status(Errors.ComplianceData.getErrStatusCode(error))
      .json({ success: false, message });
  }

  logger.log("info", "Successfully retrieved records.");
  res.status(200).json({ success: true, result: resolution.result });
}

async function resolveRecords(args: {
  complianceDataService: Services.ComplianceData.Service;
  userDataService: Auth.Core.Services.UserData.Service;
  payload: Auth.Core.Schemas.Payloads.AccessToken.Full;
}) {
  const { complianceDataService, userDataService, payload } = args;

  try {
    switch (payload.role) {
      case "student": {
        const resolver = recordsResolver["student"];
        return await resolver({
          complianceDataService,
          userDataService,
          payload,
        });
      }
      default:
        return ResultBuilder.fail(
          new Errors.ComplianceData.ErrorClass({
            name: "COMPLIANCE_DATA_QUERY_RECORD_ERROR",
            message: "Role not implemented yet.",
          })
        );
    }
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ComplianceData.normalizeError({
        name: "COMPLIANCE_DATA_QUERY_RECORD_ERROR",
        message: "Failed to get records.",
        err,
      })
    );
  }
}

const recordsResolver = {
  student: async (args: {
    complianceDataService: Services.ComplianceData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: Extract<
      Auth.Core.Schemas.Payloads.AccessToken.Full,
      { role: "student" }
    >;
  }) => {
    const { complianceDataService, payload } = args;

    const queried = await fetchRecords({
      complianceDataService,
      studentId: payload.id,
    });

    if (!queried.success) throw queried.error; //  ! propagate error

    const rawRecords = queried.result;
    const conversion = toDTORecord(rawRecords);

    return conversion;
  },

  professor: async (args: {
    complianceDataService: Services.ComplianceData.Service;
    userDataService: Auth.Core.Services.UserData.Service;
    payload: Extract<
      Auth.Core.Schemas.Payloads.AccessToken.Full,
      { role: "professor" }
    >;
  }) => [] as Types.Db.ViewModels.ComplianceRecord[], //  todo: do this
};

async function fetchRecords(args: {
  tx?: TxContext;
  complianceDataService: Services.ComplianceData.Service;
  studentId: number;
}) {
  const { tx, complianceDataService, studentId } = args;
  return await complianceDataService.queryRecord({
    dbOrTx: tx,
    fn: async (query, converter) =>
      query.findMany({
        where: converter({ studentId }),
        orderBy: (records, { desc }) => [
          desc(records.termId),
          desc(records.recordedAt),
        ],
        with: {
          uniformType: true,
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
          uniformTypeId: false,
          termId: false,
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
  | Types.ComplianceResult.Success<Schemas.ComplianceData.RecordDTO[]>
  | Types.ComplianceResult.Fail {
  const { ComplianceStatus } = Data.Records;

  try {
    const dtoRecord = rawRecords.map((record) => {
      const { id, student, uniformType, recordedAt, ...flags } = record;

      //  * record metadata
      const rawDate = new Date(recordedAt);
      const date = recordedAt.split("T")[0] as string;
      const day = Enums.Days[rawDate.getDay()] as string;
      const hours = rawDate.getHours().toString().padStart(2, "0");
      const minutes = rawDate.getMinutes().toString().padStart(2, "0");
      const time = hours + ":" + minutes; //  * hh:mm format

      const hasViolation = Object.values(flags).some((value) => !value);
      const status = hasViolation
        ? ComplianceStatus.nonCompliant
        : ComplianceStatus.compliant;

      //  * student metadata
      const { studentNumber, block, yearLevel } = student;
      const department = student.department.name;
      const { surname, firstName, middleName } = student.user;

      const dto = {
        id,
        date,
        day,
        time,
        status,
        studentNumber,
        block,
        yearLevel,
        department,
        surname,
        firstName,
        middleName,
      };
      const parsed = Schemas.ComplianceData.recordDTO.parse(dto);

      return parsed;
    });

    return ResultBuilder.success(dtoRecord);
  } catch (err) {
    return ResultBuilder.fail(
      Errors.ComplianceData.normalizeError({
        name: "COMPLIANCE_DATA_DTO_CONVERSION_ERROR",
        message: "Failed converting records to DTO.",
        err,
      })
    );
  }
}
