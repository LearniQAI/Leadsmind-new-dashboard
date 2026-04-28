"use client";
import React, { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";

const ProjectDescription = () => {
  const editorRef = useRef(null);

  return (
    <>
      <div className="col-span-12">
          <div className="from__input-box">
            <div className="form__input-title">
              <label>Project Description <span>*</span></label>
            </div>
            <form
              onSubmit={(event) => {
                submit(event);
              }}
            >
              <Editor
                apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                onInit={(_evt, editor) => (editorRef.current = editor)}
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
            </form>
          </div>
      </div>
    </>
  );
};

export default ProjectDescription;
