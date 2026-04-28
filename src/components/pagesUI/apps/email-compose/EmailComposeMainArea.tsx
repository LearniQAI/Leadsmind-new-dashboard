"use client"
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import avater1 from "../../../../../public/assets/images/avatar/avatar.png";
import { Box, Tab, Tabs } from "@mui/material";
import { primaryEmailTabs, secondaryEmailTabs } from "@/data/apps/email-data";
import { Editor } from "@tinymce/tinymce-react";
import { initializeDropzone } from "@/lib/utils/dropzoneUtils";

const EmailComposeMainArea = () => {
  const [value, setValue] = useState<number>(0);
  const editorRef = useRef<any>(null);
  const [isOpenInbox, setIsOpenInbox] = useState(false);
  const toggleDropdownInbox = () => {
    setIsOpenInbox(!isOpenInbox);
  };
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  //file upload
  useEffect(() => {
    const singleDropzone = initializeDropzone('singleFileUpload', 1);
    return () => {
      if (singleDropzone) {
        singleDropzone.destroy();
      }
    };
  }, []);

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="email__section">
          <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <div className="email__sidebar">
                <button type="button" className="btn btn-primary rounded-pill email__toggle-btn" onClick={(e) => {toggleDropdownInbox()}}>
                email filter</button>
                <div className={`email__left-side ${isOpenInbox === true ? "open" : ""}`}>
                  <div className="card__wrapper">
                    <div className="email__left-sidebar">
                      <div className="media flex-wrap mb-5">
                        <div className="media-size-email"><Image className="w-[50px] border-circle me-[10px]" src={avater1} alt="image" /></div>
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
                    <div className="email-body">
                      <div className="email-compose">
                        <div className="email-top compose-border mb-5">
                          <div className="compose-header flex-wrap gap-[10px]">
                            <h4 className="mb-0">New Message</h4>
                            <button className="btn btn-secondary" type="button"><i
                              className="fa fa-file me-2"></i>
                              save</button>
                          </div>
                        </div>
                        <div className="email-wrapper">
                          <form className="email-form">
                            <div className="form-group">
                              <label className="col-form-label pt-0" htmlFor="exampleInputEmail1">To</label>
                              <input className="form-control" id="exampleInputEmail1" type="email" />
                            </div>
                            <div className="form-group">
                              <label htmlFor="exampleInputPassword1">Subject</label>
                              <input className="form-control" id="exampleInputPassword1" type="text" />
                            </div>
                            <div className="form-group">
                              <label>Message</label>
                              <Editor
                                apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                                onInit={(_evt, editor) =>
                                  (editorRef.current = editor)
                                }
                                init={{
                                  height: 200,
                                  menubar: false,
                                  plugins: [
                                    "code",
                                    "table",
                                    "lists",
                                    "anchor",
                                    "autolink",
                                    "autosave",
                                    "charmap",
                                    "codesample",
                                    "directionality",
                                    "emoticons",
                                    "fullscreen",
                                    "help",
                                    "image",
                                    "importcss",
                                    "insertdatetime",
                                    "visualblocks",
                                    "visualchars",
                                    "wordcount",
                                    "accordion",
                                  ],
                                  toolbar:
                                    "undo redo | blockquote blocks | " +
                                    "bold italic | alignleft aligncenter alignright | " +
                                    "outdent indent code | anchor link restoredraft charmap | " +
                                    "codesample ltr rtl emoticons fullscreen | " +
                                    "help image insertdatetime lists media nonbreaking | " +
                                    "pagebreak preview save searchreplace template | " +
                                    "visualblocks visualchars wordcount accordion print",
                                  toolbar_mode: "wrap",
                                  link_default_target: "_blank",
                                  quickbars_insert_toolbar: false,
                                  content_style:
                                    "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                                }}
                              />
                            </div>
                            <div className="form-group dropzone-wrapper dropzone-border">
                              <div className="dropzone digits text-center" id="singleFileUpload">
                                <div className="dz-message needsclick"><i
                                  className="fa-thin fa-cloud-arrow-up"></i>
                                  <h6>Drop files here or click to upload.</h6><span
                                    className="note needsclick">(This is just a demo dropzone. Selected
                                    files are not actually uploaded.)</span>
                                </div>
                              </div>
                            </div>
                          </form>
                          <div className="action-wrapper">
                            <ul className="actions">
                              <li><Link className="btn btn-primary" href="#"><i
                                className="fa fa-paper-plane"></i>send </Link></li>
                              <li><Link className="btn btn-danger" href="#"> <i
                                className="fa fa-times"></i>cancel</Link></li>
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
      {/* -- App side area end -- */}
    </>
  );
};

export default EmailComposeMainArea;
