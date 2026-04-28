import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import Link from "next/link";
import React from "react";

const TermsConditionsMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Terms and Conditions" subTitle="Home" />

        <div className="row justify-content-center">
          <div className="col-xxl-12 col-xl-12 col-lg-12 col-md-12">
            <div className="card__wrapper">
              <div className="policy-wrapper relative z-[1]">
                <div className="policy-item">
                  <h4 className="policy-title">Introduction</h4>
                  <p>Welcome to Manez - HRM & CRM Dashboard. By accessing or using our Service, you
                    agree to comply with and be bound by the following terms and conditions
                    {`("Terms")`}. Please review these Terms carefully. If you do not agree to these
                    Terms, you should not use the Service.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Definitions</h4>
                  <ul>
                    <li>We refers to any individual or entity accessing or using the Service.
                    </li>
                    <li>We refer to Manez, the provider of the Service.</li>
                    <li>We refers to all information, data, text, software, graphics, and other
                      materials provided through the Service.</li>
                  </ul>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title"> Use of the Service</h4>
                  <ul>
                    <li>Users must be at least 18 years old to use the Service.</li>
                    <li>Users agree to use the Service in compliance with all applicable laws and
                      regulations.</li>
                    <li>Users are responsible for maintaining the confidentiality of their account
                      information and password.</li>
                  </ul>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">User Responsibilities</h4>
                  <ul>
                    <li>Users shall not use the Service for any illegal or unauthorized purpose.
                    </li>
                    <li>Users shall not interfere with or disrupt the Service or servers or networks
                      connected to the Service.</li>
                    <li>Users shall not attempt to gain unauthorized access to any portion of the
                      Service.</li>
                  </ul>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Privacy</h4>
                  <p>Our Privacy Policy [insert link to Privacy Policy] explains how we collect, use,
                    and disclose information about Users. By using the Service, you consent to our
                    collection and use of information as described in the Privacy Policy.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Limitation of Liability</h4>
                  <p>The Service is provided on an {`"as is" and "as available"`} basis. We make no
                    warranties, express or implied, regarding the Service, including but not limited
                    to the accuracy, completeness, or reliability of any Content.</p>
                  <p>In no event shall Manez be liable for any indirect, incidental, special,
                    consequential, or punitive damages arising out of or related to the use of the
                    Service.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Indemnification</h4>
                  <p>Users agree to indemnify, defend, and hold harmless Manez, its affiliates, and
                    their respective officers, directors, employees, and agents from and against any
                    claims, liabilities, damages, losses, and expenses, including reasonable {" "}
                    {`attorney's`} fees, arising out of or in any way connected with their use of the
                    Service.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Termination</h4>
                  <p>We reserve the right to suspend or terminate a {`User's`} access to the Service at
                    any time, with or without notice, for any reason, including but not limited to a
                    violation of these Terms.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Governing Law</h4>
                  <p>These Terms shall be governed by and construed in accordance with the laws of
                    [Your Jurisdiction], without regard to its conflict of law principles.</p>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">Changes to Terms</h4>
                  <p>We may modify these Terms at any time. The most current version of the Terms will
                    be posted on our website. By continuing to use the Service after any changes,
                    Users agree to be bound by the revised Terms.</p>
                </div>
                <div className="policy-contact">
                  <h4 className="policy-title">Contact Information</h4>
                  <p className="mb-2.5">If you have any questions about these Terms, please contact us at
                  </p>
                  <ul>
                    <li>Call: <span><Link href="tel:+012345678999">+012-3456-7890</Link></span>
                    </li>
                    <li>Email: <span><Link href="mailto:contact@manez.com">contact@manez.com</Link></span>
                    </li>
                  </ul>
                  <div className="policy-address">
                    <p className="mb-0">
                      <Link href="#">1426 Center StreetBend, or <br /> 97702,
                        California, USA</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default TermsConditionsMainArea;
