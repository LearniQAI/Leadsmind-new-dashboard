import Link from "next/link";
import React from "react";

interface TBreadcrumb {
  breadTitle: string;
  subTitle: string;
}

const Breadcrumb = ({ breadTitle, subTitle }: TBreadcrumb) => {
  return (
    <>
      <div className="breadcrumb__area">
        <div className="breadcrumb__wrapper mb-[25px]">
          <nav>
            <ol className="breadcrumb flex items-center mb-0">
              <li className="breadcrumb-item">
                <Link href="/">{subTitle}</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {breadTitle}
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Breadcrumb;
