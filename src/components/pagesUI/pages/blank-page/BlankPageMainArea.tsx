import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";

const BlankPageMainArea = () => {
  return(
    <>
         {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
              <Breadcrumb breadTitle="Blank Page" subTitle="Home"/>
                <div className="grid grid-cols-12 justify-center">

                </div>
            </div>
            {/* -- App side area end -- */}
    </>
  )
};

export default BlankPageMainArea;
