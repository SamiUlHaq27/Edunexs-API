import { OtpStatuses, OtpTypes } from '../consts';

export type OtpStatusesType = (typeof OtpStatuses)[keyof typeof OtpStatuses];
export type OtpTypesType = (typeof OtpTypes)[keyof typeof OtpTypes];
