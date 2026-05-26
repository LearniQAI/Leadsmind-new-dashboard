import Dropzone from "dropzone";
import { toast } from "sonner";

/**
 * Initializes a Dropzone instance on a given element ID.
 * @param elementId The ID of the HTML element to attach Dropzone to.
 * @param maxFiles The maximum number of files allowed.
 * @returns The Dropzone instance.
 */
export const initializeDropzone = (elementId: string, maxFiles: number = 1): Dropzone | null => {
 if (typeof window === "undefined") return null;

 const element = document.getElementById(elementId);
 if (!element) {
  console.warn(`Dropzone element with ID "${elementId}" not found.`);
  return null;
 }

 // Prevent multiple initializations on the same element
 if ((element as any).dropzone) {
  return (element as any).dropzone;
 }

 const dropzone = new Dropzone(element, {
  url: "/file/post", // Placeholder URL
  maxFiles: maxFiles,
  addRemoveLinks: true,
  acceptedFiles: "image/*,application/pdf,.doc,.docx,.xls,.xlsx",
  autoProcessQueue: false, // Don't upload automatically
  init: function(this: Dropzone) {
   this.on("addedfile", (file) => {
    if (this.files.length > maxFiles) {
     this.removeFile(file);
     toast.error(`You can only upload a maximum of ${maxFiles} files.`);
    }
   });
  }
 });

 // Add a helper method to get selected files if needed by the UI
 (dropzone as any).getSelectedFiles = () => {
  return dropzone.getAcceptedFiles();
 };

 return dropzone;
};
