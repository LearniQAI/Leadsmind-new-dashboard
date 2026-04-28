
import { IEmployee } from "@/interface";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface propsType {
  employee: IEmployee;
}

const EmployeeSingleCard = ({ employee }: propsType) => {
  return (
    <>
      <div className="col-span-12 md:col-span-6 xl:col-span-4 xxl:col-span-3">
        <div className="card__wrapper">
          <div className="employee__wrapper text-center">
            <div className="employee__thumb mb-[15px] flex justify-center">
              <Link href={`/hrm/employee-profile/${employee.id}`}>
                <Image
                  src={employee.image}
                  style={{ width: "100%", height: "auto" }}
                  priority
                  alt={`${employee.name}'s image`}
                />
              </Link>
            </div>
            <div className="employee__content">
              <div className="employee__meta mb-[15px]">
                <h4 className="mb-2">
                  <Link href={`/hrm/employee-profile/${employee.id}`}>
                    {employee.name}
                  </Link>
                </h4>
                <p>{employee.position}</p>
              </div>
              <div className="common-social mb-[20px]">
                <Link href={employee.socialLinks.facebook} target="_blank">
                  <i className="fa-brands fa-facebook-f"></i>
                </Link>
                <Link href={employee.socialLinks.twitter} target="_blank">
                  <i className="fa-brands fa-x-twitter"></i>
                </Link>
                <Link href={employee.socialLinks.linkedin} target="_blank">
                  <i className="fa-brands fa-linkedin-in"></i>
                </Link>
                <Link href={employee.socialLinks.youtube} target="_blank">
                  <i className="fa-brands fa-youtube"></i>
                </Link>
                <Link href={employee.socialLinks.website} target="_blank">
                  <i className="fa-thin fa-globe"></i>
                </Link>
              </div>
              <div className="employee__btn">
                <div className="flex items-center justify-center gap-[15px]">
                  <Link
                    className="btn btn-outline-primary"
                    href={`tel:${employee.phone}`}
                  >
                    Call
                  </Link>
                  <Link
                    className="btn btn-outline-primary"
                    href={`/hrm/employee-profile/${employee.id}`}
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeSingleCard;
