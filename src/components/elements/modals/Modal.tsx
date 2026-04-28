import React from "react";
interface WrapperProps {
  children: React.ReactNode;
  dataBsTarget:string
}

const Modal: React.FC<WrapperProps> = ({ children,dataBsTarget }) => {
  return (
    <>
      <div
        className="modal fade register__modal-area"
        id={dataBsTarget}
        role="dialog"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
