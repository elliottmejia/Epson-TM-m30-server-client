import { Editor as E } from "@tinymce/tinymce-react";

const Editor = () => {
  return (
    <>
      <E
        apiKey="7jdflnd60r80el1y98yd7mam5zg8gau65by1nx82uf2hurz9"
        init={{
          plugins: [
            "anchor",
            "autolink",
            "charmap",
            "codesample",
            "emoticons",
            "link",
            "lists",
            "media",
            "searchreplace",
            "table",
            "visualblocks",
            "wordcount",
            //premium !?
            "markdown"
          ],
          toolbar:
            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat",
          
        }}
      />
    </>
  );
};

export default Editor;
