"use client"
import Image from "next/image";
import Link from "next/link";
import React, { useRef, useState } from "react";
import avatarImg1 from "../../../../../public/assets/images/avatar/avatar2.png";
import avatarImg2 from "../../../../../public/assets/images/avatar/avatar.png";
import productImg1 from "../../../../../public/assets/images/product/item1.png";
import productImg2 from "../../../../../public/assets/images/product/item2.png";
import productImg3 from "../../../../../public/assets/images/product/item3.png";
import { Box, Tab, Tabs } from "@mui/material";
import { Editor } from "@tinymce/tinymce-react";
import {primaryEmailTabs, secondaryEmailTabs } from "@/data/apps/email-data";


const EmailReadMainArea = () => {
  const editorRef = useRef<any>(null);
  const [value, setValue] = useState<number>(0);
  const [isOpenInbox, setIsOpenInbox] = useState(false);
  const toggleDropdownInbox = () => {
    setIsOpenInbox(!isOpenInbox);
  };
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="email__section">
          <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
            <div className="col-span-12 xl:col-span-3">
              <div className="email__sidebar">
                <button type="button" className="btn btn-primary rounded-pill email__toggle-btn" onClick={(e) => {toggleDropdownInbox()}}>
                email filter</button>
                <div className={`email__left-side ${isOpenInbox === true ? "open" : ""}`}>
                  <div className="card__wrapper">
                    <div className="email__left-sidebar">
                      <div className="media flex-wrap mb-5">
                        <div className="media-size-email"><Image className="w-[50px] border-circle me-[10px]" src={avatarImg2} priority alt="image" /></div>
                        <div className="media-body">
                          <h6 className="f-w-600">Jhon Smith</h6>
                          <p>jhonsmith@manez.com</p>
                        </div>
                      </div>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Tabs
                          value={value}
                          onChange={handleChange}
                          orientation="vertical"
                          variant="scrollable"
                        >
                            {primaryEmailTabs.map((email, index) => (
                            <Tab key={index}
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <span className="flex items-center">
                                    <i className={`${email.icon} me-3`} />
                                    {email.label}
                                  </span>
                                  {email.count !== null && (
                                    <span className="email__left-meta">{email.count}</span>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                          <div className="divider"></div>
                          {secondaryEmailTabs.map((email, index) => (
                            <Tab key={index}
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <span className="flex items-center">
                                    <i className={`${email.icon} me-3`} />
                                    {email.label}
                                  </span>
                                  {email.count !== null && (
                                    <span className="email__left-meta">{email.count}</span>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                        </Tabs>
                      </Box>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 xl:col-span-9">
              <div className="email-right-aside">
                <div className="card__wrapper">
                  <div className="email__profile">
                    <div className="email-right-aside">
                      <div className="email-body">
                        <div className="email-content">
                          <div className="email-top mb-5">
                            <div className="flex flex-wrap items-center justify-between">
                              <div className="media">
                                <div className="media-size-email"><Image className="w-[50px] border-circle me-[10px]" src={avatarImg1} priority alt="avatar image" /></div>
                                <div className="media-body">
                                  <h6 className="f-w-600">Sophia Miller</h6>
                                  <p>sophiamiller@manez.com</p>
                                </div>
                              </div>
                              <div className="maill__time">
                                <span>Fri, Dec 1, 1:59 AM (1 day ago)</span>
                              </div>
                            </div>
                          </div>
                          <div className="email-wrapper">
                            <div className="emailread-group">
                              <div className="email-subject">
                                <h3>Elevate Your Business with Our Advanced Dashboard Solution</h3>
                              </div>
                              <div className="read-group">
                                <p>Dear Jhon Smith,</p>
                                <p>I trust this message finds you in good health.</p>
                              </div>
                              <div className="read-group">
                                <p>As your business continues to evolve, so does the need for robust
                                  tools to manage and interpret your data effectively. {`That's`} why {`we're`}
                                  excited to introduce our latest Dashboard Solution—a dynamic platform
                                  designed to revolutionize the way you visualize, analyze, and
                                  leverage your data.</p>
                                <p className="mt-[10px]">Ready to elevate your data management to new heights?
                                  Our Dashboard Solution is your key to unlocking the full potential of
                                  your business intelligence.</p>
                                <ul>
                                  <li>Real-Time Insights</li>
                                  <li>User-Friendly Interface</li>
                                  <li>Customizable Widgets</li>
                                  <li>Data Security</li>
                                  <li>Seamless Integration</li>
                                </ul>
                                <p className="mt-[10px]">To learn more about our Dashboard Solution and discuss
                                  how it can specifically benefit Bdevs, I would be happy to schedule a
                                  personalized demonstration at your convenience. Reply to this email
                                  or give me a call at +1234567890 to coordinate a time that works for
                                  you.</p>
                                <p className="mt-[10px]">Thank you for considering Bdevs as your partner in data
                                  excellence. We look forward to the opportunity to contribute to your
                                  business success.</p>
                              </div>
                            </div>
                            <div className="emailread-group">
                              <div className="flex items-center justify-between">
                                <span className="mb-0"><i className="fa-light fa-paperclip"></i>{" "}
                                  Attach Files</span><Link className="btn btn-warning font-semibold" href="#">Download All</Link>
                              </div>
                              <div className="attachment flex flex-wrap items-end">
                                <ul>
                                  <li><Image className="img-fluid" src={productImg1} priority alt="image not found" />
                                  </li>
                                  <li><Image className="img-fluid" src={productImg2} priority alt="image not found" />
                                  </li>
                                  <li><Image className="img-fluid" src={productImg3} priority alt="image not found" />
                                  </li>
                                  <li></li>
                                </ul>
                                <Link href="#">documents.pdf</Link>
                              </div>
                            </div>
                            <div className="emailread-group">
                              <Editor
                                apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                                onInit={(_evt, editor) => (editorRef.current = editor)}
                                initialValue="<p>Write your reply</p>"
                                init={{
                                  height: 200,
                                  menubar: false,
                                  plugins: ["advlist", "autolink","lists","link","image","charmap","preview","anchor","searchreplace","visualblocks","code","fullscreen",
                                    "insertdatetime", "media","table","help","wordcount","codesample","emoticons","hr","nonbreaking","pagebreak","visualchars","template",
                                    "autosave","save",
                                  ],
                                  toolbar:
                                    "undo redo | blocks | " +
                                    "bold italic underline forecolor | alignleft aligncenter " +
                                    "alignright alignjustify | bullist numlist outdent indent | " +
                                    "link image media | codesample emoticons | fullscreen preview code | " +
                                    "removeformat | help | spellchecker | insertdatetime",
                                  content_style:
                                    "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                                }}
                              />
                              <div className="email__btn-wrap">
                                <ul className="actions">
                                  <li><Link className="btn btn-primary" href="#"><i className="fa fa-reply"></i>Reply</Link></li>
                                  <li><Link className="btn btn-secondary" href="#"><i className="fa fa-reply-all"></i>Reply All</Link></li>
                                  <li><Link className="btn btn-danger" href="#"><i className="fa fa-share"></i>Forward</Link></li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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

export default EmailReadMainArea;
