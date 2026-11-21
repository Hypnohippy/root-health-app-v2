export const metadata={title:"Activate your Root Health introducer invitation"};

export default function ActivateIntroducerPage() {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f4f1ea",fontFamily:"Arial,sans-serif",color:"#182018"}}>
    <section style={{width:"min(100%,560px)",padding:36,borderRadius:24,background:"#fff",boxShadow:"0 18px 55px rgba(20,30,20,.1)"}}>
      <p style={{fontSize:12,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:"#68715d"}}>Root Health · Professional Introducer</p>
      <h1>Activate your invitation</h1>
      <p>Root sends a private, single-use activation email only after your individual agreement has been accepted and verified. Open that email on this site, verify your address and choose your own password.</p>
      <p>This page does not create accounts or send another invitation. If your link has expired or you did not receive it, contact Root Health through your existing onboarding contact.</p>
      <a href="/login?next=%2Fintroducer" style={{display:"inline-block",marginTop:8,padding:"12px 18px",borderRadius:999,background:"#263b2b",color:"white",textDecoration:"none",fontWeight:700}}>Professional Introducer sign in</a>
      <p style={{marginTop:32,fontSize:12,color:"#687068"}}>© 2024–2026 Root Health. All rights reserved.</p>
    </section>
  </main>;
}
