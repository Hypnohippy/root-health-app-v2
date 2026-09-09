"use client";
export default function CorporateOutputStyles() {
 return <style jsx global>{`
 .root-output{width:100%;min-width:0;text-align:left;color:#29382e;overflow-wrap:anywhere}
 .root-output .output-toolbar,.root-output .buttons{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
 .root-output button{font:inherit;font-size:14px;line-height:1.5;border:1px solid #b9cabb;border-radius:999px;padding:10px 16px;background:#edf2eb;color:#29533a;cursor:pointer;white-space:normal}
 .root-output button.primary{background:#29533a;color:white;font-weight:600}.root-output button:disabled{opacity:.5;cursor:default}
 .root-output .output-panel{box-sizing:border-box;min-width:0;width:100%;padding:clamp(18px,3vw,30px);margin:16px 0;border:1px solid #cbd8cb;border-radius:22px;background:#faf9f5}
 .root-output fieldset{border:0;padding:0;margin:0;min-width:0}.root-output h3{font-size:20px;margin:22px 0 10px}.root-output p{line-height:1.65;margin:10px 0}
 .root-output label{display:flex;flex-direction:column;gap:8px;margin:18px 0;font-weight:600;min-width:0}.root-output .confirmation{display:flex;flex-direction:row;align-items:flex-start;font-size:14px;font-weight:400;line-height:1.6}
 .root-output input:not([type=checkbox]),.root-output textarea{box-sizing:border-box;display:block;width:100%;min-width:0;max-width:100%;padding:12px 14px;border:1px solid #bdcdbd;border-radius:12px;font:inherit;line-height:1.6;background:white;color:#29382e}
 .root-output input[type=checkbox]{flex:0 0 auto;margin:5px 3px 0 0}.root-output textarea{min-height:100px;resize:vertical}
 .root-output .provenance{font-size:13px;color:#526956}.root-output .root-document-preview{padding:8px 0;line-height:1.7}.root-output details{border-top:1px solid #d7dfd4;margin-top:22px;padding-top:18px}.root-output summary{cursor:pointer;font-weight:600}
 .root-output .evidence-check{margin:20px 0;padding:18px 20px;border:1px solid #b9cabb;border-radius:16px;background:#edf2eb}.root-output .evidence-check h3{margin:0 0 10px}.root-output .evidence-check.attention{border-color:#ae783f;background:#faf1e3}
 .root-output button:focus-visible,.root-output input:focus-visible,.root-output textarea:focus-visible{outline:2px solid #526956;outline-offset:2px}
 @media(max-width:600px){.root-output .output-toolbar,.root-output .buttons{flex-direction:column}.root-output button{width:100%}}
 `}</style>;
}
