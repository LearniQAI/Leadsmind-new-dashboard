import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import Link from "next/link";
import React from "react";

const PrivacyPolicyMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Privacy and Policy" subTitle="Home"/>

        <div className="row justify-content-center">
          <div className="col-xxl-12 col-xl-12 col-lg-12 col-md-12">
            <div className="card__wrapper">
              <div className="policy-wrapper relative z-[1]">
                <div className="policy-item">
                  <h4 className="policy-title">Introduction</h4>
                  <p>Manez is committed to protecting the privacy of our users. This Privacy Policy
                    explains how we collect, use, disclose, and safeguard your information when you
                    use our HRM & CRM Dashboard. Please read this Privacy Policy carefully. If you
                    do not agree with the terms of this Privacy Policy, please do not use the
                    Service.</p>
                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Information We Collect</h4>
                  <p>We may collect and process the following types of information:</p>
                  <div className="policy-subitem">
                    <h4 className="policy-title">Personal Information:</h4>
                    <ul>
                      <li>Name</li>
                      <li>Email address</li>
                      <li>Contact information</li>
                      <li>Job title and company information</li>
                      <li>Login credentials</li>
                    </ul>
                  </div>
                  <div className="policy-subitem">
                    <h4 className="policy-title">Usage Data:</h4>
                    <ul>
                      <li>IP address</li>
                      <li>Browser type and version</li>
                      <li>Pages visited and time spent on the Service</li>
                      <li>Click stream data</li>
                    </ul>
                  </div>
                  <div className="policy-subitem">
                    <h4 className="policy-title">HRM Data:</h4>
                    <ul>
                      <li>Employee records (e.g., names, job titles, performance data)</li>
                      <li>Payroll information</li>
                      <li>Attendance records</li>
                    </ul>
                  </div>
                  <div className="policy-subitem">
                    <h4 className="policy-title">CRM Data:</h4>
                    <ul>
                      <li>Customer information (e.g., names, contact details, purchase history)
                      </li>
                      <li>Interaction records (e.g., emails, phone calls, support tickets)</li>
                    </ul>
                  </div>
                </div>
                <div className="policy-item">
                  <h4 className="policy-title">How We Use Your Information</h4>
                  <p>We use the information we collect in the following ways:</p>
                  <ul>
                    <li>To provide, operate, and maintain the Service</li>
                    <li>To improve, personalize, and expand the Service</li>
                    <li>To understand and analyze how you use the Service</li>
                    <li>To develop new products, services, features, and functionality</li>
                    <li>To communicate with you, either directly or through one of our partners,
                      including for customer service, to provide you with updates and other
                      information relating to the Service, and for marketing and promotional
                      purposes</li>
                    <li>To process your transactions and manage your orders</li>
                    <li>To find and prevent fraud</li>
                    <li>To comply with legal obligations</li>
                  </ul>
                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Sharing Your Information</h4>
                  <p>We may share your information in the following situations:</p>
                  <ul>
                    <li>With service providers and partners who assist us in operating the Service,
                      conducting our business, or servicing you, so long as those parties agree to
                      keep this information confidential</li>
                    <li>In response to a request for information if we believe disclosure is in
                      accordance with, or required by, any applicable law, regulation, or legal
                      process</li>
                    <li>If we believe your actions are inconsistent with our user agreements or
                      policies, or to protect the rights, property, and safety of Manez or others
                    </li>
                    <li>In connection with, or during negotiations of, any merger, sale of company
                      assets, financing, or acquisition of all or a portion of our business to
                      another company</li>
                    <li>With your consent or at your direction</li>
                  </ul>
                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Data Security</h4>
                  <p>We use administrative, technical, and physical security measures to help protect
                    your personal information. While we have taken reasonable steps to secure the
                    personal information you provide to us, please be aware that despite our
                    efforts, no security measures are perfect or impenetrable, and no method of data
                    transmission can be guaranteed against any interception or other type of misuse.
                  </p>

                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Your Data Protection Rights</h4>
                  <p>Depending on your location, you may have the following rights regarding your
                    personal data:</p>
                  <ul>
                    <li><strong>The right to access</strong> – You have the right to request copies
                      of your personal data.</li>
                    <li><strong>The right to rectification</strong> – You have the right to request
                      that we correct any information you believe is inaccurate or complete
                      information you believe is incomplete.</li>
                    <li><strong>The right to erasure</strong> – You have the right to request that
                      we erase your personal data, under certain conditions.</li>
                    <li><strong>The right to restrict processing</strong> – You have the right to
                      request that we restrict the processing of your personal data, under certain
                      conditions.</li>
                    <li><strong>The right to object to processing</strong> – You have the right to
                      object to our processing of your personal data, under certain conditions.
                    </li>
                    <li><strong>The right to data portability</strong> – You have the right to
                      request that we transfer the data that we have collected to another
                      organization, or directly to you, under certain conditions.</li>
                  </ul>
                  <p>If you make a request, we have one month to respond to you. If you would like to
                    exercise any of these rights, please contact us at our contact information
                    below.</p>

                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Children’s Privacy</h4>
                  <p>Our Service does not address anyone under the age of 18. We do not knowingly
                    collect personally identifiable information from anyone under the age of 18. If
                    you are a parent or guardian and you are aware that your child has provided us
                    with personal information, please contact us. If we become aware that we have
                    collected personal information from children without verification of parental
                    consent, we take steps to remove that information from our servers.</p>

                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Children’s Privacy</h4>
                  <p>Our website is not intended for children under the age of 13, and we do not
                    knowingly collect
                    personal information from children under the age of 13. If you are a parent or
                    guardian and
                    believe that your child has provided us with personal information, please
                    contact us.</p>
                </div>

                <div className="policy-item">
                  <h4 className="policy-title">Changes to This Privacy Policy</h4>
                  <p>We may update our Privacy Policy from time to time. We will notify you of any
                    changes by posting the new Privacy Policy on this page. You are advised to
                    review this Privacy Policy periodically for any changes. Changes to this Privacy
                    Policy are effective when they are posted on this page.</p>

                </div>

                <div className="policy-contact">
                  <h4 className="policy-title">Contact Us</h4>
                  <p>If you have any questions about this Privacy Policy, please contact us at:</p>
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

export default PrivacyPolicyMainArea;
