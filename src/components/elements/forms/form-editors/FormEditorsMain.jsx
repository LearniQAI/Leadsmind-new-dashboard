'use client'
import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';

const FormEditorsArea = () => {
    const editorRef = useRef(null);

    return (
        <>
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Forms Editors' subTitle='Home' />
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Editors</h5>
                            </div>
                            <div className="from__input-box">
                                <form onSubmit={(event) => { submit(event) }}>
                                    <Editor
                                        apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                                        onInit={(_evt, editor) => (editorRef.current = editor)}
                                        initialValue="<p>Hello, World! <br> From Manez...</p>"
                                        init={{
                                            height: 400,
                                            menubar: true,
                                            plugins: [
                                                "advlist", "autolink", "lists", "charmap", "preview",
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
                                            toolbar_mode: "floating",
                                            responsive: true,
                                            content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                                        }}
                                    />
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Simple Editors</h5>
                            </div>
                            <div className="from__input-box">
                                <Editor
                                    apiKey="uonxh66a1gnxnn8g0lsc2ow4pa5c9jys8sa0fadd1txn49y7"
                                    onInit={(_evt, editor) => (editorRef.current = editor)}
                                    initialValue="<p>Hello, World! <br> From Manez...</p>"
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
                                        toolbar_mode: "floating",
                                        responsive: true,
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
        </>
    );
};

export default FormEditorsArea;
