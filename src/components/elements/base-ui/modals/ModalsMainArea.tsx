import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import ModalStatic from "./ModalStatic";
import TemplateModal from "./TemplateModal";
import ModalSizing from "./ModalSizing";

const ModalsMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Modal" subTitle="Ui Elements" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <div className="col-span-12 xxl:col-span-8">
            <ModalStatic />
          </div>
          <div className="col-span-12 xxl:col-span-4">
            <TemplateModal />
          </div>
          <div className="col-span-12">
            <ModalSizing />
          </div>
        </div>
        {/* -- App side area end -- */}
      </div>
    </>
  );
};

export default ModalsMainArea;
