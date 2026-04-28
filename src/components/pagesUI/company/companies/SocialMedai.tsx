// components/SocialMedai.tsx
import LinkInput from "@/components/elements/SharedInputs/LinkInput";
import { CompanyInformationFormProps } from "@/interface";
import React from "react";

const SocialMedai: React.FC<CompanyInformationFormProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="Facebook" id="facebook" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="Skype" id="skype" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="X" id="x" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="Instagram" id="instagram" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="Youtube" id="youtube" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="WhatsApp" id="whatsApp" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="WeChats" id="weChats" defaultValue="test" />
      </div>
      <div className="col-span-12 md:col-span-6">
        <LinkInput label="TikTok" id="tikTok" defaultValue="test" />
      </div>
    </div>
  );
};

export default SocialMedai;
