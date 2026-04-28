import { ICompany } from "@/interface/table.interface";
import { Control, FieldErrors, UseFormRegister } from "react-hook-form";

export interface CompanyInformationFormProps  {
  register: UseFormRegister<ICompany>;
  errors: FieldErrors<ICompany>;
  control?: Control<ICompany>;
};
