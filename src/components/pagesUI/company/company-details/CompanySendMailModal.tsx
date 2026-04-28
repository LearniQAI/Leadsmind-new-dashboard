"use client";
import React, { useRef } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { statePropsType } from "@/interface/common.interface";
import { Editor } from "@tinymce/tinymce-react";


const CompanySendMailModal = ({ open, setOpen }: statePropsType) => {
    const handleToggle = () => setOpen(!open);
    const editorRef = useRef<any>(null);

    return (
        <>
            <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
                <DialogTitle>
                    <div className="flex justify-between">
                        <h5 className="modal-title">Compose New Mail</h5>
                        <button
                            onClick={handleToggle}
                            type="button"
                            className="bd-btn-close"
                        >
                            <i className="fa-solid fa-xmark-large"></i>
                        </button>
                    </div>
                </DialogTitle>
                <DialogContent className="common-scrollbar overflow-y-auto">
                    <form>
                        <div className="card__wrapper">
                            <div className="grid grid-cols-12 gap-y-6 gap-x-6 maxXs:gap-x-0 justify-center items-center">
                                <div className="col-span-12">
                                    <div className="from__input-box">
                                        <div className="form__input">
                                            <input
                                                className="form-control"
                                                name="mailTo"
                                                id="mailTo"
                                                type="text"
                                                placeholder="To"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <div className="from__input-box">
                                        <div className="form__input">
                                            <input
                                                className="form-control"
                                                name="mailCc"
                                                id="mailCc"
                                                type="text"
                                                placeholder="Cc"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <div className="from__input-box">
                                        <div className="form__input">
                                            <input
                                                className="form-control"
                                                name="mailBcc"
                                                id="mailBcc"
                                                type="text"
                                                placeholder="Bcc"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12">
                                    <div className="from__input-box">
                                        <div className="form__input">
                                            <input
                                                className="form-control"
                                                name="subject"
                                                id="subject"
                                                type="text"
                                                placeholder="Subject"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12">
                                    <div className="card__wrapper">
                                        <div className="card__title-wrap mb-5">
                                            <h5 className="card__heading-title">Simple Editors</h5>
                                        </div>
                                        <div className="from__input-box">
                                        <Editor
                                        apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                                        onInit={(_evt, editor) => (editorRef.current = editor)}
                                        initialValue="<p>Hello, World! <br> From Manez...</p>"
                                        init={{
                                            height: 300,
                                            menubar: true,
                                            plugins: [
                                                "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
                                                "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
                                                "insertdatetime", "media", "table", "help", "wordcount",
                                                "codesample", "emoticons", "nonbreaking", "pagebreak",
                                                "visualchars", "autosave", "save"
                                            ],
                                            toolbar: [
                                                "undo redo | blocks fontfamily fontsize | bold italic underline forecolor |",
                                                "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent |",
                                                "link image media | codesample emoticons | fullscreen preview code |",
                                                "removeformat | help | insertdatetime"
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
                                                "Wingdings=wingdings,zapf dingbats"
                                            ].join("; "),
                                            toolbar_mode: "wrap",
                                            content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                                        }}
                                    />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="submit__btn flex flex-wrap items-center justify-center gap-[10px]">
                            <button type="submit" className="btn btn-primary"><i className="fa-light fa-paper-plane"></i>
                                Send</button>
                            <button type="submit" className="btn btn-success"><i
                                className="fa-sharp fa-light fa-floppy-disk"></i> Save</button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CompanySendMailModal;
