import { MASTER_DOCUMENT_ID, replacements, validateTemplate, validateMerged, hash } from './introducerGoogleAgreementTerms.js';

const DRIVE='https://www.googleapis.com/drive/v3';
const DOCS='https://docs.googleapis.com/v1/documents';
const validId = value => /^[\w-]+$/.test(value || '');
export function googleAgreementConfig(env=process.env) {
  const config={clientId:env.GOOGLE_AGREEMENTS_CLIENT_ID,clientSecret:env.GOOGLE_AGREEMENTS_CLIENT_SECRET,
    refreshToken:env.GOOGLE_AGREEMENTS_REFRESH_TOKEN,folderId:env.GOOGLE_AGREEMENTS_FOLDER_ID};
  if(Object.values(config).some(v=>!v) || !validId(config.folderId)) throw new Error('Google agreement connection is not configured.');
  return config;
}
export function createAgreementDrive(config, fetcher=fetch) {
  let token;
  async function accessToken() {
    if(!token) {
      const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),
        body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:config.refreshToken,grant_type:'refresh_token'})});
      if(!response.ok) throw new Error('Google authorisation failed. Reconnect the Root account.');
      token=(await response.json()).access_token;
      if(!token) throw new Error('Google authorisation failed.');
    }
    return token;
  }
  async function request(url,options={},binary=false) {
    const response=await fetcher(url,{...options,signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${await accessToken()}`,...options.headers}});
    if(!response.ok) {
      const error=new Error(`Google agreement operation failed (HTTP ${response.status}).`);
      error.status=response.status;throw error;
    }
    if(binary) return Buffer.from(await response.arrayBuffer());
    return response.status===204 ? {} : response.json();
  }
  const json = (method,body) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const metadata = id => request(`${DRIVE}/files/${id}?fields=id,name,mimeType,ownedByMe,capabilities,parents,appProperties,version,webViewLink,trashed`);
  async function permissions(id) {
    const rows=[]; let next='';
    do { const page=await request(`${DRIVE}/files/${id}/permissions?fields=nextPageToken,permissions(id,type,role,emailAddress,permissionDetails)&pageSize=100${next?'&pageToken='+encodeURIComponent(next):''}`);
      rows.push(...(page.permissions || [])); next=page.nextPageToken;
    } while(next);
    return rows;
  }
  const permission = (id,permissionId) =>
    request(`${DRIVE}/files/${id}/permissions/${permissionId}?fields=id,type,role,emailAddress,permissionDetails`);
  // Owner access is evidence only when Google bound this exact ID to the requested recipient.
  const usableRecipientGrant = (grant,permissionId=null) => grant && grant.type==='user' &&
    (['writer','reader'].includes(grant.role) || (grant.role==='owner' && permissionId && grant.id===permissionId));
  function recipientGrant(grants,recipient,permissionId=null) {
    const exact=grants.find(p=>usableRecipientGrant(p) && p.emailAddress?.toLowerCase()===recipient?.toLowerCase());
    if(exact) return exact;
    if(permissionId) return grants.find(p=>usableRecipientGrant(p,permissionId) && p.id===permissionId);
    return null;
  }
  const recipientHash = recipient => hash(recipient.trim().toLowerCase());
  const boundPermission = (file,recipient) => file.appProperties?.rootAgreementRecipientHash===recipientHash(recipient)
    ? file.appProperties.rootAgreementRecipientPermissionId : null;
  async function rememberRecipientPermission(id,file,permissionId,recipient) {
    if(!permissionId || boundPermission(file,recipient)===permissionId) return;
    const appProperties={...(file.appProperties || {}),rootAgreementRecipientPermissionId:permissionId,
      rootAgreementRecipientHash:recipientHash(recipient)};
    await request(`${DRIVE}/files/${id}?fields=id,appProperties`,json('PATCH',{appProperties}));
    file.appProperties=appProperties;
  }
  async function privateFile(id,recipient=null,permissionId=null,requiredRole=null) {
    const file=await metadata(id);
    if(!file.ownedByMe || file.trashed) throw new Error('Root must own the agreement file/folder.');
    const grants=await permissions(id);
    // Old unbound appProperties may have been populated by the unsafe sole-user fallback.
    const allowed=recipient ? recipientGrant(grants,recipient,permissionId || boundPermission(file,recipient)) : null;
    if(!grants.some(p=>p.role==='owner') || grants.some(p=>p.role!=='owner' && (!allowed || p.id!==allowed.id)))
      throw new Error('Agreement sharing is broader than Root and the intended recipient.');
    if(requiredRole && (!allowed || (requiredRole==='writer' && allowed.role!=='writer')))
      throw new Error('Recipient does not have access to this agreement.');
    return file;
  }
  async function folder() {
    const f=await privateFile(config.folderId);
    if(f.mimeType!=='application/vnd.google-apps.folder' || f.name!=='Root Health Introducer Agreements')
      throw new Error('Select the private Root Health Introducer Agreements folder.');
  }
  const document = id => request(`${DOCS}/${id}?includeTabsContent=true`);
  async function findCopy(operationId) {
    const q=`'${config.folderId}' in parents and trashed = false and appProperties has { key='rootAgreementOperation' and value='${operationId}' }`;
    const found=await request(`${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id),nextPageToken`);
    if(found.nextPageToken || found.files?.length>1) throw new Error('Multiple operation copies found; Root must reconcile them.');
    return found.files?.[0]?.id;
  }
  async function generate(operation,checkpoint) {
    await folder();
    const values=replacements(operation.payload.terms);
    let id=operation.progress.document_id;
    if(!id && operation.progress.copy_started) {
      id=await findCopy(operation.id);
      if(!id) throw new Error('Copy outcome uncertain. Reconcile Google Drive before retrying; no second copy was created.');
    }
    if(!id) {
      const source=await metadata(MASTER_DOCUMENT_ID);
      if(source.mimeType!=='application/vnd.google-apps.document' || !source.capabilities?.canCopy) throw new Error('Master template cannot be copied.');
      const master=await document(MASTER_DOCUMENT_ID);
      validateTemplate(master,values);
      await checkpoint({copy_started:true,template_revision:master.revisionId || source.version});
      const copy=await request(`${DRIVE}/files/${MASTER_DOCUMENT_ID}/copy?ignoreDefaultVisibility=true&fields=id`,json('POST',{
        name:`Root Health Introducer Agreement - ${operation.payload.terms.introducer_name}`,
        parents:[config.folderId],writersCanShare:false,appProperties:{rootAgreementOperation:operation.id},
      }));
      id=copy.id;
    }
    await checkpoint({document_id:id});
    const recipient=operation.payload.terms.contact_email;
    const recordedPermission=operation.progress.recipient_email_hash===recipientHash(recipient)
      ? operation.progress.recipient_permission_id : null;
    await privateFile(id,recipient,recordedPermission);
    if(!operation.progress.merged) {
      const doc=await document(id);
      if(!operation.progress.merge_started) validateTemplate(doc,values);
      await checkpoint({merge_started:true});
      // Literal replacement is safe to repeat after a lost response: existing values contain no tokens.
      await request(`${DOCS}/${id}:batchUpdate`,json('POST',{writeControl:{requiredRevisionId:doc.revisionId},requests:
        Object.entries(values).map(([key,value])=>({replaceAllText:{containsText:{text:`{{${key}}}`,matchCase:true},replaceText:value}}))}));
      validateMerged(await document(id));
      await checkpoint({merged:true});
    }
    const file=await metadata(id);
    const grants=await permissions(id);
    let grant=recipientGrant(grants,recipient,recordedPermission || boundPermission(file,recipient));
    try {
      let permissionId=recordedPermission || boundPermission(file,recipient);
      if(!grant && !permissionId) {
        if(operation.progress.recipient_create_started) throw new Error('Recipient permission outcome uncertain; reconcile the existing operation before another share request.');
        await checkpoint({recipient_stage:'create_requested',recipient_create_started:true});
        const created=await request(`${DRIVE}/files/${id}/permissions?sendNotificationEmail=false&fields=id`,
          json('POST',{type:'user',role:'writer',emailAddress:recipient}));
        permissionId=typeof created.id==='string' && created.id ? created.id : null;
        await checkpoint({recipient_stage:'create_returned',recipient_create_has_id:Boolean(permissionId),
          recipient_permission_id:permissionId,recipient_email_hash:recipientHash(recipient)});
        if(!permissionId) throw new Error('Recipient does not have access to this agreement.');
      }
      if(!grant) {
        await checkpoint({recipient_stage:'get_requested'});
        grant=await permission(id,permissionId);
        await checkpoint({recipient_stage:'get_returned',recipient_id_matches:grant.id===permissionId,
          recipient_type:['user','group','domain','anyone'].includes(grant.type)?grant.type:'missing_or_unknown',
          recipient_role:['owner','writer','reader','commenter','organizer','fileOrganizer'].includes(grant.role)?grant.role:'missing_or_unknown'});
        if(grant.id!==permissionId) throw new Error('Recipient does not have access to this agreement.');
      }
      if(!usableRecipientGrant(grant,permissionId) || !grant.id) throw new Error('Recipient does not have access to this agreement.');
      await checkpoint({recipient_stage:'list_verification'});
      await privateFile(id,recipient,grant.id,'access');
      await rememberRecipientPermission(id,file,grant.id,recipient);
      await checkpoint({recipient_stage:'verified'});
    } catch(error) {
      await checkpoint({recipient_http_status:Number.isInteger(error.status)?error.status:null});
      throw error;
    }
    return {document_id:id,document_url:`https://docs.google.com/document/d/${id}/edit`,template_revision:operation.progress.template_revision};
  }
  async function verifyDocument(agreement,recipient) {
    await folder();
    await privateFile(agreement.document_id,recipient,null,'access');
    validateMerged(await document(agreement.document_id));
  }
  async function reviewSnapshot(agreement) {
    await verifyDocument(agreement,agreement.terms_snapshot.contact_email);
    const before=await metadata(agreement.document_id);
    const bytes=await request(`${DRIVE}/files/${agreement.document_id}/export?mimeType=application%2Fpdf`,{},true);
    const after=await metadata(agreement.document_id);
    if(before.version!==after.version)throw new Error('Document changed during export. Review the document and retry.');
    if(bytes.length>10*1024*1024 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('Invalid or oversized PDF export.');
    return {pdf_base64:bytes.toString('base64'),pdf_sha256:hash(bytes),source_revision:before.version};
  }
  async function archive(operation,agreement,checkpoint,frozen=null) {
    if(frozen)await folder();else await verifyDocument(agreement,agreement.terms_snapshot.contact_email);
    let pdfId=operation.progress.pdf_id;
    if(!pdfId) {
      const ids=await request(`${DRIVE}/files/generateIds?count=1&space=drive&type=files`);
      pdfId=ids.ids[0];
      await checkpoint({pdf_id:pdfId});
    }
    let saved=null;
    if(operation.progress.pdf_started) {
      try {saved=await privateFile(pdfId);} catch(error) {if(error.status!==404)throw error;}
    }
    if(saved) {
      if(saved.mimeType!=='application/pdf' || saved.appProperties?.rootAgreementOperation!==operation.id) throw new Error('Archive identity mismatch.');
      const bytes=await request(`${DRIVE}/files/${pdfId}?alt=media`,{},true);
      if(hash(bytes)!==operation.progress.pdf_hash) throw new Error('Archive hash mismatch.');
    } else {
      const before=frozen?{version:frozen.sourceRevision}:await metadata(agreement.document_id);
      const bytes=frozen?frozen.bytes:await request(`${DRIVE}/files/${agreement.document_id}/export?mimeType=application%2Fpdf`,{},true);
      const after=frozen?before:await metadata(agreement.document_id);
      if(before.version!==after.version) throw new Error('Document changed during export. Review the returned document and retry.');
      if(bytes.length>10*1024*1024 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid or oversized PDF export.');
      const sha=hash(bytes);
      if(operation.progress.pdf_hash && (operation.progress.pdf_hash!==sha || operation.progress.source_revision!==before.version))
        throw new Error('Archive source changed after an interrupted upload. Root must reconcile the pending snapshot.');
      await checkpoint({pdf_started:true,pdf_hash:sha,source_revision:before.version});
      const boundary=`root_agreement_${operation.id}`;
      const meta={id:pdfId,name:`Accepted Agreement - ${agreement.terms_snapshot.introducer_name} - v${agreement.version}.pdf`,
        mimeType:'application/pdf',parents:[config.folderId],appProperties:{rootAgreementOperation:operation.id}};
      const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--`)]);
      await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ignoreDefaultVisibility=true&fields=id',
        {method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
      await privateFile(pdfId);
      const readback=await request(`${DRIVE}/files/${pdfId}?alt=media`,{},true);
      if(hash(readback)!==sha) throw new Error('Uploaded PDF hash verification failed.');
    }
    return {pdf_document_id:pdfId,pdf_document_url:`https://drive.google.com/file/d/${pdfId}/view`,pdf_sha256:operation.progress.pdf_hash,
      source_revision:operation.progress.source_revision};
  }
  return {generate,archive,verifyDocument,reviewSnapshot};
}
