"use client";
import React, { useState, useRef, useEffect } from "react";
import { priorityData, projectStatus } from "@/data/dropdown-data";
import { Editor } from "@tinymce/tinymce-react";
import { initializeDropzone } from "@/lib/utils/dropzoneUtils";
import { useForm } from "react-hook-form";
import { ICreateProject } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
const ProjectCreateForm: React.FC = () => {
  const editorRef = useRef<any>(null);
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const [selectEndDate, setSelectEndDate] = useState<Date | null>(new Date());
  const {
    register,
    handleSubmit,
    control,

    formState: { errors },
  } = useForm<ICreateProject>();

  const onSubmit = async (data: ICreateProject) => {};

  //file handle
  useEffect(() => {
    const multiDropzone = initializeDropzone("multiFileUpload", 10);

    return () => {
      if (multiDropzone) {
        multiDropzone.destroy();
      }
    };
  }, []);
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <div className="col-span-12">
            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
              <div className="col-span-12">
                <div className="card__wrapper">
                  <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                    {/* Project Name */}
                    <div className="col-span-12">
                      <InputField
                        label="Project Name"
                        id="projectName"
                        type="text"
                        register={register("projectName", {
                          required: "Project Name is required",
                        })}
                        error={errors.projectName}
                      />
                    </div>
                    {/* Project Thumbnail */}
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label htmlFor="projectThumbnail">
                            Project Thumbnail<span>*</span>
                          </label>
                        </div>
                        <div className="form__input">
                          <input
                            className="form-control"
                            name="name"
                            id="projectThumbnail"
                            type="file"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Start Date */}
                    <div className="col-span-12 md:col-span-6 xl:col-span-6">
                      <FormLabel label="Start Date" id="selectStartDate" />
                      <div className="datepicker-style">
                        <DatePicker
                          id="selectStartDate"
                          selected={selectStartDate}
                          onChange={(date) => setSelectStartDate(date)}
                          showYearDropdown
                          showMonthDropdown
                          useShortMonthInDropdown
                          showPopperArrow={false}
                          peekNextMonth
                          dropdownMode="select"
                          isClearable
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Start date"
                          className="w-full"
                        />
                      </div>
                    </div>
                    {/* Deadline */}
                    <div className="col-span-12 md:col-span-6 xl:col-span-6">
                      <FormLabel label="Deadline" id="deadline" />
                      <div className="datepicker-style">
                        <DatePicker
                          id="deadline"
                          selected={selectEndDate}
                          onChange={(date) => setSelectEndDate(date)}
                          showYearDropdown
                          showMonthDropdown
                          useShortMonthInDropdown
                          showPopperArrow={false}
                          peekNextMonth
                          dropdownMode="select"
                          isClearable
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Deadline"
                          className="w-full"
                        />
                      </div>
                    </div>
                    {/* Priority */}
                    <div className="col-span-12 md:col-span-12 xl:col-span-6">
                      <SelectBox
                        id="priority"
                        label="Priority"
                        options={priorityData}
                        control={control}
                        error={errors.priority}
                      />
                    </div>
                    {/* Status */}
                    <div className="col-span-12 md:col-span-12 xl:col-span-6">
                      <SelectBox
                        id="status"
                        label="Status"
                        options={projectStatus}
                        control={control}
                        error={errors.status}
                      />
                    </div>

                    {/* ====== Attached Files Section ====== */}
                    <div className="col-span-12 dropzone-wrapper dropzone-border">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label>Attached files</label>
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
                    {/* ===== End of Attached Files Section ===== */}

                    {/* ===== from editor */}
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label>
                            Project Description <span>*</span>
                          </label>
                        </div>
                        <Editor
                          apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                          onInit={(_evt, editor) =>
                            (editorRef.current = editor)
                          }
                          init={{
                            height: 300,
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 flex justify-center items-center">
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

export default ProjectCreateForm;
