"use client";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import { initializeDropzone } from "@/lib/utils/dropzoneUtils";
import { IBlogCreateForm } from "@/interface";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
const BlogCreateForm = () => {
  const [selectTransferDate, setSelectTransferDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IBlogCreateForm>();
  const editorRef = useRef<any>(null);
  const singleDropzoneRef = useRef<Dropzone | null>(null);
  const multiDropzoneRef = useRef<Dropzone | null>(null);
  useEffect(() => {
    singleDropzoneRef.current = initializeDropzone("singleFileUpload", 1);
    multiDropzoneRef.current = initializeDropzone("multiFileUpload", 10);

    return () => {
      singleDropzoneRef.current?.destroy();
      multiDropzoneRef.current?.destroy();
    };
  }, []);

  const onSubmit = (data: IBlogCreateForm) => {
    // Access content from TinyMCE editor
    const blogDescriptionContent = editorRef.current?.getContent() || "";
    data.blogDescription = blogDescriptionContent;

    const singleSelectedFiles =
      (singleDropzoneRef.current as any).getSelectedFiles?.() || [];
    const multiSelectedFiles =
      (multiDropzoneRef.current as any).getSelectedFiles?.() || [];
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="grid grid-cols-12 gy-10">
              <div className="col-span-12">
                <div className="card__wrapper">
                  <div className="grid grid-cols-12 gap-y-5 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label htmlFor="blogName2">
                            Blog Title<span>*</span>
                          </label>
                        </div>
                        <div className="form__input">
                          <input
                            className="form-control"
                            id="blogName2"
                            {...register("blogName2", {
                              required: "Blog Title is required",
                            })}
                          />
                          {errors.blogName2 && (
                            <p className="text-red-500">
                              {errors.blogName2.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label>
                            Blog Thumb<span>*</span>
                          </label>
                        </div>
                      </div>
                      <div
                        className="dropzone dz-clickable"
                        id="singleFileUpload"
                      >
                        <div className="dz-default dz-message">
                          <i className="fa-thin fa-cloud-arrow-up"></i>
                          <h6>Drop files here or click to upload.</h6>
                          <span className="note needsclick">
                            (This is just a demo dropzone. Selected files are
                            not actually uploaded.)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <FormLabel label="Create Date" id="selectCreateDate" />
                      <div className="datepicker-style">
                        <DatePicker
                          id="selectCreateDate"
                          selected={selectTransferDate}
                          onChange={(date) => setSelectTransferDate(date)}
                          showYearDropdown
                          showMonthDropdown
                          useShortMonthInDropdown
                          showPopperArrow={false}
                          peekNextMonth
                          dropdownMode="select"
                          isClearable
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Create date"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label htmlFor="blogStatus" className="form-label">
                            Status
                            <span>*</span>
                          </label>
                        </div>
                        <div className="form__input">
                          <select
                            id="blogStatus"
                            className="form-select"
                            {...register("blogStatus", {
                              required: "Status is required",
                            })}
                          >
                            <option value="Publish">Publish</option>
                            <option value="Draft">Draft</option>
                          </select>
                          {errors.blogStatus && (
                            <p className="text-red-500">
                              {errors.blogStatus.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label>
                            Blog Description
                            <span>*</span>
                          </label>
                        </div>
                        <div className="from__input-box">
                          <Editor
                            apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                            onInit={(_evt, editor) =>
                              (editorRef.current = editor)
                            }
                            init={{
                              height: 300,
                              menubar: true,
                              plugins: [
                                "advlist",
                                "autolink",
                                "lists",
                                "charmap",
                                "preview",
                                "anchor",
                                "searchreplace",
                                "visualblocks",
                                "code",
                                "fullscreen",
                                "insertdatetime",
                                "media",
                                "table",
                                "help",
                                "wordcount",
                                "codesample",
                                "emoticons",
                                "nonbreaking",
                                "pagebreak",
                                "visualchars",
                                "autosave",
                                "save",
                              ],
                              toolbar: [
                                "undo redo | blocks fontfamily fontsize | bold italic underline forecolor |",
                                "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent |",
                                "link image media | codesample emoticons | fullscreen preview code |",
                                "removeformat | help | insertdatetime",
                              ].join(" "),
                              font_family_formats: [
                                "Manrope=manrope,Andale Mono=andale mono,times",
                                "Arial=arial,helvetica,sans-serif",
                                "Arial Black=arial black,avant garde",
                                "Book Antiqua=book antiqua,palatino",
                                "Comic Sans MS=comic sans ms,sans-serif",
                                "Courier New=courier new,courier",
                                "Georgia=georgia,palatino",
                                "Helvetica=helvetica",
                                "Impact=impact,chicago",
                                "Symbol=symbol",
                                "Tahoma=tahoma,arial,helvetica,sans-serif",
                                "Terminal=terminal,monaco",
                                "Times New Roman=times new roman,times",
                                "Trebuchet MS=trebuchet ms,geneva",
                                "Verdana=verdana,geneva",
                                "Webdings=webdings",
                                "Wingdings=wingdings,zapf dingbats",
                              ].join("; "),
                              toolbar_mode: "floating",
                              responsive: true,
                              content_style:
                                "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label>Blog Gallery</label>
                        </div>
                      </div>
                      <div
                        className="dropzone dz-clickable"
                        id="multiFileUpload"
                      >
                        <div className="dz-default dz-message">
                          <i className="fa-thin fa-cloud-arrow-up"></i>
                          <h6>Drop files here or click to upload.</h6>
                          <span className="note needsclick">
                            (This is just a demo dropzone. Selected files are
                            not actually uploaded.)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 flex justify-center">
            <div className="submit__btn text-center mb-[20px]">
              <button className="btn btn-primary" type="submit">
                Submit
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default BlogCreateForm;
