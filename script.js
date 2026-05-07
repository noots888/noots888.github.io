
const STORAGE_KEY='field_diary_entries_v1';
const OLD_STORAGE_KEYS=['tx'+'diary_entries_clean_v1'];
const UI_KEY='field_diary_ui_v1';
const PAY_KEY='field_diary_pay_v1';
const NOTES_KEY='field_diary_notes_v1';
const QUICK_KEY='field_diary_quick_v1';
const GH_KEY='field_diary_github_v1';
const RDO_KEY='field_diary_rdo_roster_v1';
const FATIGUE_KEY='field_diary_fatigue_settings_v1';
const CREW_LIST_KEY='field_diary_crew_list_v1';
const VEHICLE_LIST_KEY='field_diary_vehicle_list_v1';
const CREW_GROUPS_KEY='field_diary_crew_groups_v2';
const VEHICLE_GROUPS_KEY='field_diary_vehicle_groups_v2';
const SUBSTATION_LIST_KEY='field_diary_substation_list_v1';
const CIRCUIT_LIST_KEY='field_diary_circuit_list_v1';
const ACCOMMODATION_LIST_KEY='field_diary_accommodation_list_v1';
const SWOP_LIST_KEY='field_diary_swop_list_v1';
const GROUP_OPEN_KEY='field_diary_group_open_v1';
const CREW_VEHICLE_SECTION_OPEN_KEY='field_diary_crew_vehicle_section_open_v1';
const CREW_VEHICLE_MEMORY_KEY='field_diary_crew_vehicle_memory_v1';
const APP_VERSION='26.05.07-breakfix-stable1';
const GH_LAST_ISO_KEY='ghLastISO';
const DEFAULT_CREW_NAMES=['John H','Matty W','Nick S','Louis S','Erwin B','Adam D'];
const DEFAULT_VEHICLE_NAMES=['Ute 1','Ute 2','Truck','EWP','Patrol','Crane','Trailer','Hilux','Canter','Other'];
const DEFAULT_CREW_GROUPS={'Team 1':[], 'Team 2':[], 'Cables':[], 'Team 3':[], 'Team 4':[], 'Management':[], 'Contractors':[], 'Distribution':[]};
const DEFAULT_VEHICLE_GROUPS={'Team 1 Vehicles':[], 'EWP':[], 'Flat Top':[], 'Crane':[], 'Digger':[], 'Line Truck':[], 'Stump Puller':[], 'Light Vehicle':[]};
const DEFAULT_SUBSTATIONS=[];
const DEFAULT_CIRCUITS=[];
const DEFAULT_ACCOMMODATION=[];
const DEFAULT_SWOPS=[];
const APP_BACKUP_KEYS=[
  STORAGE_KEY,UI_KEY,PAY_KEY,NOTES_KEY,QUICK_KEY,RDO_KEY,FATIGUE_KEY,
  CREW_LIST_KEY,VEHICLE_LIST_KEY,CREW_GROUPS_KEY,VEHICLE_GROUPS_KEY,
  SUBSTATION_LIST_KEY,CIRCUIT_LIST_KEY,ACCOMMODATION_LIST_KEY,SWOP_LIST_KEY,
  GROUP_OPEN_KEY,CREW_VEHICLE_SECTION_OPEN_KEY,CREW_VEHICLE_MEMORY_KEY,'ghLast',GH_LAST_ISO_KEY
];
const SETTINGS_PAGE_SIZE=8;
let CREW_NAMES=[];
let VEHICLE_NAMES=[];
let CREW_GROUPS={};
let VEHICLE_GROUPS={};
let SUBSTATIONS=[];
let CIRCUITS=[];
let ACCOMMODATION=[];
let SWOPS=[];
let settingsPages={crew:0,vehicles:0,substations:0,circuits:0};
let RDO_SETTINGS={baseDate:'',moves:[]};
const STD_HOURS=8.28;
let selectedDate=todayISO();let calendarDate=new Date();let weekStart=getWeekStart(new Date());let lastTap={date:null,time:0};let lastUnlockTap=0;let ghSyncing=false;let swipeBusy=false;
let entry=blankEntry(selectedDate);
function haptic(t='light'){if(navigator.vibrate){navigator.vibrate(t==='heavy'?[25,10,25]:t==='medium'?20:8)}}
function toast(m){const el=document.getElementById('toast');el.textContent=m;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1600)}
function todayISO(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function iso(d){const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)}
function niceDate(s){return new Date(s+'T12:00:00').toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})}
function fullDate(s){return new Date(s+'T12:00:00').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function relativeDateTag(s){const d=new Date(s+'T12:00:00');const t=new Date();const y=new Date();y.setDate(t.getDate()-1);if(d.toDateString()===t.toDateString())return 'Today';if(d.toDateString()===y.toDateString())return 'Yesterday';return ''}
function topDateHTML(s){const tag=relativeDateTag(s);return esc(fullDate(s))+(tag?` <span class="dateTag">${tag}</span>`:'')}
function getJSON(k,f){try{return JSON.parse(localStorage.getItem(k)||'')}catch{return f}}
function setJSON(k,v){localStorage.setItem(k,JSON.stringify(v))}
function migrateLegacyStorageKeys(){
  try{
    OLD_STORAGE_KEYS.forEach(oldKey=>{
      const oldVal=localStorage.getItem(oldKey);
      const newVal=localStorage.getItem(STORAGE_KEY);
      if(oldVal!==null&&newVal===null){
        localStorage.setItem(STORAGE_KEY,oldVal);
        localStorage.removeItem(oldKey);
        localStorage.setItem('field_diary_storage_migrated_v1',new Date().toISOString());
      }else if(oldVal!==null&&newVal!==null){
        localStorage.removeItem(oldKey);
      }
    });
  }catch(e){console.warn('Storage migration skipped',e)}
}
migrateLegacyStorageKeys();
function loadRDOSettings(){
  const raw=getJSON(RDO_KEY,{baseDate:'',moves:[]});
  RDO_SETTINGS={baseDate:raw?.baseDate||'',moves:Array.isArray(raw?.moves)?raw.moves.filter(x=>x&&x.holiday&&x.rdo):[]};
}
function saveRDOSettings(){setJSON(RDO_KEY,RDO_SETTINGS);renderRDOSettings();renderAll(false);debouncedAutoSync();}
function dateDiffDays(a,b){const A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.round((B-A)/86400000);}
function rdoMoveForHolidayDate(date){return (RDO_SETTINGS.moves||[]).find(m=>m.holiday===date)||null;}
function rdoMoveForMovedDate(date){return (RDO_SETTINGS.moves||[]).find(m=>m.rdo===date)||null;}
function isBaseRosterRDODate(date){if(!RDO_SETTINGS.baseDate)return false;const diff=dateDiffDays(RDO_SETTINGS.baseDate,date);return diff>=0 && diff%14===0;}
function isRosterRDODate(date){if(!date)return false;if(rdoMoveForMovedDate(date))return true;if(rdoMoveForHolidayDate(date))return false;return isBaseRosterRDODate(date);}
function hasManualStatus(e){return !!(e?.flags?.working||e?.flags?.rdo||e?.flags?.publicHoliday||e?.flags?.sickLeave||e?.flags?.annualLeave||e?.flags?.rdoWorked||e?.flags?.publicHolidayWorked);}
function hasDiaryWorkData(e){return !!((e?.jobs&&e.jobs.length)||(e?.crew&&e.crew.length)||(e?.vehicles&&e.vehicles.length)||String(e?.note||'').trim()||String(e?.allowanceDetails||'').trim());}
function applyRosterRDO(e){
  if(!e||!e.date||!e.flags)return e;
  if(isRosterRDODate(e.date)&&!hasManualStatus(e)&&!hasDiaryWorkData(e)){
    e.flags.rdo=true;e.flags.working=false;e.flags.normalHours=false;e.rosterAutoRDO=true;
  }
  return e;
}

function getEntries(){const e=getJSON(STORAGE_KEY,{});return e&&typeof e==='object'?e:{}}
function setEntries(e){setJSON(STORAGE_KEY,e)}
function isFuture(s){return s>todayISO()}
function isWeekendDate(s){const d=new Date(String(s||selectedDate)+'T12:00:00');const day=d.getDay();return day===0||day===6}
function hasLeaveDay(e){return !!(e?.flags?.rdo||e?.flags?.publicHoliday||e?.flags?.sickLeave||e?.flags?.annualLeave)}
function hasWorkedLeaveDay(e){return !!(e?.flags?.rdoWorked||e?.flags?.publicHolidayWorked)}
function isNonWorkLeaveDay(e){return !!(e?.flags?.rdo||e?.flags?.publicHoliday||e?.flags?.sickLeave||e?.flags?.annualLeave)}
function isEntryLocked(e=entry){return !e?.manualUnlock && (isNonWorkLeaveDay(e)||!!e?.locked)}
function isCompleteEntry(e=entry){const c=completion(e);return !!(c.status&&c.hours&&c.crewVehicles&&c.jobs)}
function lockReason(e=entry){if(isNonWorkLeaveDay(e))return statusText(e)+' selected — entry fields locked and not required.';return 'Completed day locked — tap Edit Day to change.'}
function applyAutoLock(e){if(!e)return e;enforceWorkHourRules(e);if(isWeekendOffDay(e)){e.locked=false;e.manualUnlock=false;return e;}if(!isCompleteEntry(e)){e.locked=false;e.manualUnlock=false;return e;}if(!e.manualUnlock)e.locked=true;return e;}
function hasFullDayLeave(e){return hasLeaveDay(e)}
function isImplicitWeekdayWork(e){return !!(e&&e.date&&!isWeekendDate(e.date)&&!hasLeaveDay(e)&&!hasWorkedLeaveDay(e))}
function isWorkDay(e){return !!(e?.flags?.working||e?.flags?.rdoWorked||e?.flags?.publicHolidayWorked||isImplicitWeekdayWork(e))}
function hasNormalHours(e){return !!((e?.flags?.normalHours)||e?.flags?.rdoWorked||e?.flags?.publicHoliday||e?.flags?.publicHolidayWorked||isImplicitWeekdayWork(e))}
function isWeekendNormalWorked(e){e=e||entry;return !!(isWeekendDate(e.date)&&e.flags?.working&&!e.flags?.rdoWorked&&!e.flags?.publicHolidayWorked&&!e.flags?.rdo&&!e.flags?.publicHoliday&&!e.flags?.sickLeave&&!e.flags?.annualLeave)}
function hasWeekendWorkData(e){
  e=e||entry;
  if(!e||!isWeekendDate(e.date))return false;
  const flags=e.flags||{};
  // Weekend should stay OFF unless there is real work evidence.
  // A stale/hidden working=true flag by itself must not make Saturday/Sunday incomplete.
  return !!(
    flags.rdoWorked||flags.publicHolidayWorked||
    (flags.working&&e.manualUnlock===true)||
    (e.jobs&&e.jobs.length>0)||
    (e.crew&&e.crew.length>0)||
    (e.vehicles&&e.vehicles.length>0)||
    String(e.overtimeStart||'').trim()||String(e.overtimeFinish||'').trim()||
    String(e.note||'').trim()||String(e.allowanceDetails||'').trim()||
    flags.allowances||flags.helicopter||flags.onCall||flags.onCallWeekend||flags.onCallPH||
    flags.nightshift||flags.laha||flags.inconvenience||flags.higherDuties
  );
}
function isWeekendOffDay(e){e=e||entry;return !!(e&&isWeekendDate(e.date)&&!hasLeaveDay(e)&&!hasWeekendWorkData(e))}
function normalHoursForPay(e){e=enforceWorkHourRules(migrate(e,e?.date||selectedDate));if(e.flags.rdo&&!e.flags.rdoWorked)return false;return hasNormalHours(e)&&!isWeekendNormalWorked(e)}
function enforceWorkHourRules(e){
 if(!e||!e.flags)return e;
 if(e.flags.rdoWorked||e.flags.publicHolidayWorked){e.flags.working=true;e.flags.normalHours=true;return e;}
 if(e.flags.rdo){e.flags.working=false;e.flags.normalHours=false;return e;}
 if(e.flags.publicHoliday){e.flags.working=false;e.flags.normalHours=true;return e;}
 if(e.flags.sickLeave||e.flags.annualLeave){e.flags.working=false;e.flags.normalHours=false;return e;}
 if(isImplicitWeekdayWork(e)){e.flags.working=true;e.flags.normalHours=true;}
 if(isWeekendDate(e.date)&&!e.flags.working){e.flags.normalHours=false;}
 return e;
}
function blankEntry(date){return {date,flags:{working:false,rdo:false,publicHoliday:false,sickLeave:false,annualLeave:false,rdoWorked:false,publicHolidayWorked:false,normalHours:false,overtime:false,partDayLeave:false,onCall:false,onCallWeekend:false,onCallPH:false,nightshift:false,higherDuties:false,laha:false,inconvenience:false,allowances:false,helicopter:false,noneAllowance:false},overtimeStart:'',overtimeFinish:'',partDayLeaveStart:'',partDayLeaveFinish:'',allowanceDetails:'',accommodation:'',crew:[],vehicles:[],jobs:[],note:'',locked:false,manualUnlock:false}}
function migrate(e,date){const b=blankEntry(date);if(!e)return enforceWorkHourRules(applyRosterRDO(b));return enforceWorkHourRules(applyRosterRDO({...b,...e,date,flags:{...b.flags,...(e.flags||{})},crew:Array.isArray(e.crew)?e.crew:(e.crew?String(e.crew).split(',').map(x=>x.trim()).filter(Boolean):[]),vehicles:Array.isArray(e.vehicles)?e.vehicles:(e.vehicles&&typeof e.vehicles==='object'?Object.keys(e.vehicles).filter(k=>e.vehicles[k]):[]),jobs:Array.isArray(e.jobs)?e.jobs.map(migrateJob):[]}))}
function migrateJob(j){j=j||{};return {id:j.id||('j'+Date.now()+Math.random()),type:j.type||workTypeFromOld(j.workTypes)||'',workOrder:j.workOrder||'',lineName:j.lineName||'',faultDetails:j.faultDetails||'',description:j.description||j.workCompleted||'',helicopterPilot:j.helicopterPilot||'',helicopterRego:j.helicopterRego||'',helicopterLandingZone:j.helicopterLandingZone||'',helicopterFlightDetails:j.helicopterFlightDetails||'',poleType:j.poleType||'',poleTypeOther:(j.poleTypeOther??j.poleOtherText??''),switchingCircuit:j.switchingCircuit||'',switchingSubstation:j.switchingSubstation||'',switchingAction:j.switchingAction||'',switchingWorkOrder:j.switchingWorkOrder||'',switchingRows:Array.isArray(j.switchingRows)&&j.switchingRows.length?j.switchingRows:[{swop:'',substation:''}],startTime:j.startTime||j.start||'',finishTime:j.finishTime||j.end||'',crewVehiclesOpen:false}}
function workTypeFromOld(w){if(!w)return '';return Object.keys(w).filter(k=>w[k]).join(', ')||''}

function withPanelScrollLock(panelId,fn){
  const panel=document.getElementById(panelId);
  const scroller=panel?panel.querySelector('.panelBody'):null;
  const oldTop=scroller?scroller.scrollTop:0;
  const active=document.activeElement;
  try{fn&&fn();}finally{
    requestAnimationFrame(()=>{
      if(scroller)scroller.scrollTop=oldTop;
      if(active&&typeof active.focus==='function'&&document.contains(active)){
        try{active.focus({preventScroll:true});}catch(e){}
      }
    });
  }
}
function saveLocalQuietNoRender(){
  if(isFuture(selectedDate))return;
  readFormToEntry();
  const entries=getEntries();
  entries[selectedDate]=entry;
  setEntries(entries);
  saveUI();
  debouncedAutoSync();
}

function currentEntry(){readFormToEntry();return entry}
function saveLocal(){if(isFuture(selectedDate))return;readFormToEntry();applyAutoLock(entry);const entries=getEntries();entries[selectedDate]=entry;setEntries(entries);saveUI();renderAll(false)}
function selectDate(date){if(isFuture(date)){toast('Future days locked');return}selectedDate=date;entry=applyAutoLock(migrate(getEntries()[date],date));const entries=getEntries();entries[selectedDate]=entry;setEntries(entries);calendarDate=new Date(date+'T12:00:00');weekStart=getWeekStart(new Date(date+'T12:00:00'));writeEntryToForm();saveUI();renderAll();}
function saveUI(){setJSON(UI_KEY,{selectedDate,activePanel:document.querySelector('.panel.open')?.id||null})}
function restoreUI(){
  const u=getJSON(UI_KEY,{});
  const editingPanel=!!(u.activePanel&&document.getElementById(u.activePanel));

  // Keep the selected diary date after refresh/reload.
  // Only fall back to today if there is no saved date or it is a future date.
  if(u.selectedDate&&!isFuture(u.selectedDate)){
    selectedDate=u.selectedDate;
  }else{
    selectedDate=todayISO();
  }

  entry=applyAutoLock(migrate(getEntries()[selectedDate],selectedDate));
  const entries=getEntries();
  entries[selectedDate]=entry;
  setEntries(entries);
  calendarDate=new Date(selectedDate+'T12:00:00');
  weekStart=getWeekStart(new Date(selectedDate+'T12:00:00'));
  writeEntryToForm();
  renderAll();
  // Refresh should return to the main dashboard, not reopen stale panels.
  closePanel();
}
function openPanel(id,vibe=true){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));const p=document.getElementById(id);if(p){p.classList.add('open');if(vibe)haptic('light');if(id==='calendarPanel')renderCalendar();if(id==='weeklyPanel')renderWeekly();if(id==='earningsPanel')renderEarnings();if(id==='fatiguePanel')renderFatiguePanel();if(id==='quickPanel'){writeEntryToForm();setTimeout(autoGrowQuickNote,30);}if(id==='drawPanel')setTimeout(initDrawPad,40);if(id==='notesPanel')renderNotes();if(id==='settingsPanel'){loadPayInputs();loadGitHubSettings();const ss=document.getElementById('settingsSearch');if(ss){ss.value='';filterSettingsBlocks('');}document.querySelectorAll('#settingsPanel .settingsBlock').forEach(b=>b.classList.remove('open'));renderSettingsManagers();renderBuildInfo();}saveUI();}}
function closePanel(){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));saveUI()}
function dashboardTile(id,title,value,sub,complete,extra='',disabled=false){const cls=`tile ${complete?'complete':'incomplete'} ${extra} ${disabled?'lockedTile':''}`;const action=disabled?'':' onclick="openPanel(\''+id+'\')"';const icon=disabled?'🔒':(complete?'✓':'!');const iconCls=disabled?'ok':(complete?'ok':'bad');return `<div class="${cls}"${action} aria-disabled="${disabled?'true':'false'}"><div class="tileIcon ${iconCls}">${icon}</div><h3>${title}</h3><div class="value">${value}</div><div class="sub">${sub||''}</div></div>`}
function actionTile(title,value,sub,onclick,complete=true,extra=''){return `<div class="tile full ${complete?'complete':'neutral'} ${extra}" onclick="${onclick}"><div class="tileIcon ${complete?'ok':'bad'}">${complete?'✓':'!'}</div><h3>${title}</h3><div class="value">${value}</div><div class="sub">${sub||''}</div></div>`}
function renderDashboard(){const c=completion(entry);const s=statusText(entry);const hours=hourSummary(entry);const jobs=entry.jobs.length;const locked=isEntryLocked(entry);const fs=fatigueStatusForDate(selectedDate);const weekendOff=isWeekendOffDay(entry);let html='';
 if(weekendOff){
   html+=dashboardTile('statusPanel','Day Status','Weekend Off','No entry required',true,'weekendOffTile')+
    dashboardTile('hoursPanel','Allowances','Off','Not required',true,'weekendOffTile')+
    dashboardTile('crewPanel','Crew + Vehicles','Off','Not required',true,'weekendOffTile')+
    dashboardTile('jobsPanel','Jobs','Off','Not required',true,'weekendOffTile')+
    actionTile('Weekend Mode','Work This Day','Tap to convert this weekend into a work day','convertSelectedToWorkDay()',true,'workThisDayTile');
 }else{
   const blockTiles=locked;
   html+=dashboardTile('statusPanel','Day Status',blockTiles?'Locked':s,blockTiles?'Use Edit Day below to change':(c.status?'Ready':'Select day type'),c.status,'',blockTiles)+
    dashboardTile('hoursPanel','Allowances',blockTiles?'Locked':hours.main,blockTiles?'Not accessible while locked':hours.sub,c.hours,'',blockTiles)+
    dashboardTile('crewPanel','Crew + Vehicles',blockTiles?'Locked':`${entry.crew.length} Crew`,blockTiles?'Not accessible while locked':`${entry.vehicles.length} Vehicles`,c.crewVehicles,'',blockTiles)+
    dashboardTile('jobsPanel','Jobs',blockTiles?'Locked':`${jobs} Job${jobs===1?'':'s'}`,blockTiles?'Not accessible while locked':(c.jobs?'Ready':'Required fields needed'),c.jobs,'',blockTiles);
 }
 if(fs.cls!=='ok')html+=`<div class="tile full ${fs.cls==='breach'?'incomplete':'neutral'}" onclick="openPanel('fatiguePanel')"><div class="tileIcon ${fs.cls==='breach'?'bad':'ok'}">${fs.cls==='breach'?'!':'⚠'}</div><h3>Fatigue</h3><div class="value">${fs.title}</div><div class="sub">${fs.message}</div></div>`;
 if(locked){html+=`<div class="tile full complete editDayTile" onclick="handleUnlockTap()"><div class="tileIcon ok">🔒</div><h3>Day Locked</h3><div class="value">${isNonWorkLeaveDay(entry)?'Leave/RDO locked':'Completed'}</div><div class="sub">Double tap to edit this day</div></div>`}
 else if(entry.manualUnlock&&isCompleteEntry(entry)&&!weekendOff){html+=`<div class="tile full neutral editDayTile" onclick="lockDay()"><div class="tileIcon ok">↩</div><h3>Edit Mode</h3><div class="value">Lock Day</div><div class="sub">Tap when you are done editing</div></div>`}
 document.getElementById('dashboard').innerHTML=html;
 renderBackupHealthStrip();
}
function renderTop(){document.getElementById('topDateText').innerHTML=topDateHTML(selectedDate)}
function renderAll(sync=true){renderTop();renderDashboard();renderStatusChoices();renderHours();renderCrewVehicles();renderJobs();renderWeekly();renderCalendar();renderNotes();renderEarnings();renderBackupStatus();renderBackupHealthStrip();renderFatiguePanel();renderBuildInfo();if(sync)debouncedAutoSync()}
function completion(e){
  e=enforceWorkHourRules(migrate(e,e?.date||selectedDate));
  if(isNonWorkLeaveDay(e)||isWeekendOffDay(e)){
    return {status:true,hours:true,crewVehicles:true,jobs:true};
  }
  const hoursOk=!!(e.flags.noneAllowance||e.flags.allowances||e.flags.helicopter||e.flags.onCall||e.flags.onCallWeekend||e.flags.onCallPH||e.flags.nightshift||e.flags.laha||e.flags.inconvenience||e.flags.higherDuties||String(e.allowanceDetails||'').trim());
  const jobsOk=e.jobs.length>0&&e.jobs.every(jobComplete);
  const heliOk=!e.flags.helicopter||e.jobs.some(j=>jobHasType(j,'Helicopter')&&helicopterCompleteForJob(j));
  return {status:!!(isWorkDay(e)||hasLeaveDay(e)),hours:hoursOk,crewVehicles:e.crew.length>0&&e.vehicles.length>0,jobs:jobsOk&&heliOk};
}

function jobComplete(j){
  if(!j||!j.type||!j.startTime||!j.finishTime)return false;
  if(jobHasType(j,'Helicopter'))return helicopterCompleteForJob(j);
  if(jobHasType(j,'Switching'))return switchingRowsComplete(j);
  if(!j.workOrder||!j.lineName||!j.description)return false;
  if((jobHasType(j,'Faults')||String(j.type||'').toLowerCase().includes('fault'))&&!j.faultDetails)return false;
  if(jobHasType(j,'Pole')&&(!j.poleType||(j.poleType==='Other'&&!String(j.poleTypeOther||'').trim())))return false;
  return true;
}
function missingList(e=entry){const c=completion(e),m=[];if(!c.status)m.push('Day Status');if(!c.hours)m.push('Allowances');if(!c.crewVehicles)m.push('Crew + Vehicles');if(!c.jobs)m.push('Jobs');return m}
function statusText(e){e=enforceWorkHourRules(migrate(e,e?.date||selectedDate));if(e.flags.rdoWorked)return 'RDO (Worked)';if(e.flags.publicHolidayWorked)return 'Public Holiday (Worked)';if(e.flags.rdo)return 'RDO';if(e.flags.publicHoliday)return 'Public Holiday';if(e.flags.sickLeave)return 'Sick Leave';if(e.flags.annualLeave)return 'Annual Leave';if(isWeekendOffDay(e))return 'Weekend Off';if(isWorkDay(e))return 'Normal';return 'Not selected'}
function hourSummary(e){e=enforceWorkHourRules(migrate(e,e?.date||selectedDate));const bits=[];if(e.flags.noneAllowance)bits.push('None');if(e.flags.allowances)bits.push('General');if(e.flags.helicopter)bits.push('Helicopter');if(e.flags.onCall)bits.push('On-call');if(e.flags.onCallWeekend)bits.push('On-call Weekend');if(e.flags.onCallPH)bits.push('On-call PH');if(e.flags.nightshift)bits.push('Nightshift');if(e.flags.laha)bits.push('LAHA');if(e.flags.inconvenience)bits.push('Inconvenience');if(e.flags.higherDuties)bits.push('Higher Duties');if(e.allowanceDetails)bits.push('Notes');return {main:bits.length?bits[0]:'Select',sub:bits.length?bits.join(' · '):'Tap None if no allowances'}}
function readFormToEntry(){if(!entry)return;['overtimeStart','overtimeFinish','partDayLeaveStart','partDayLeaveFinish','allowanceDetails'].forEach(id=>{const el=document.getElementById(id);if(el)entry[id]=el.value}); const acc=document.getElementById('accommodationSelect'); if(acc)entry.accommodation=acc.value;const q=document.getElementById('quickNote');if(q)localStorage.setItem(QUICK_KEY,q.value)}
function writeEntryToForm(){['overtimeStart','overtimeFinish','partDayLeaveStart','partDayLeaveFinish','allowanceDetails'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=entry[id]||''}); renderAccommodationSelect();const q=document.getElementById('quickNote');if(q){q.value=localStorage.getItem(QUICK_KEY)||'';setTimeout(autoGrowQuickNote,0)}}
function exclusiveStatus(k){const normal=(k==='normal'||k==='working');['working','rdo','publicHoliday','sickLeave','annualLeave','rdoWorked','publicHolidayWorked'].forEach(x=>entry.flags[x]=false);if(normal){entry.flags.working=true;entry.flags.normalHours=true;if(isWeekendDate(entry.date))entry.manualUnlock=true;}else{entry.flags[k]=true;entry.flags.working=false;if(k==='rdo'||k==='rdoWorked'||k==='publicHolidayWorked')entry.flags.normalHours=true;if(k==='publicHoliday')entry.flags.normalHours=true;if(k==='sickLeave'||k==='annualLeave')entry.flags.normalHours=false;}saveLocal();haptic('medium')}

function convertSelectedToWorkDay(){
  if(isFuture(selectedDate)){toast('Future days locked');return;}
  ['rdo','publicHoliday','sickLeave','annualLeave','rdoWorked','publicHolidayWorked'].forEach(k=>entry.flags[k]=false);
  entry.flags.working=true;
  entry.flags.normalHours=true;
  entry.locked=false;
  entry.manualUnlock=true;
  saveLocal();
  toast('Converted to work day');
  haptic('medium');
}
function toggleFlag(k){entry.flags[k]=!entry.flags[k];saveLocal();haptic('light')}
function setNoAllowances(){if(isEntryLocked(entry)){toast(lockReason(entry));return;}entry.flags.noneAllowance=true;['allowances','helicopter','onCall','onCallWeekend','onCallPH','nightshift','laha','inconvenience','higherDuties'].forEach(k=>entry.flags[k]=false);entry.allowanceDetails='';entry.accommodation='';const input=document.getElementById('allowanceDetails');if(input)input.value='';saveLocal();haptic('light')}
function toggleAllowanceFlag(k){
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  entry.flags[k]=!entry.flags[k];
  if(entry.flags[k])entry.flags.noneAllowance=false;
  if(k==='laha'&&!entry.flags[k])entry.accommodation='';
  if(k==='helicopter'&&entry.flags[k])handleHelicopterAllowance();
  saveLocal();
  if(k==='laha'&&entry.flags[k])setTimeout(()=>document.getElementById('accommodationSelect')?.focus(),80);
  haptic('light')
}

function handleHelicopterAllowance(){
  entry.flags.working=true;

  let heliJob=entry.jobs.find(j=>jobHasType(j,'Helicopter'));
  if(!heliJob){
    if(entry.jobs.length){
      heliJob=entry.jobs[0];
      const list=jobTypeList(heliJob);
      if(!list.some(x=>x.toLowerCase()==='helicopter'))list.push('Helicopter');
      heliJob.type=list.join(', ');
    }else{
      entry.jobs.push({
        id:'j'+Date.now()+Math.random().toString(36).slice(2),
        type:'Helicopter',
        workOrder:'',
        lineName:'',
        faultDetails:'',
        description:'',
        helicopterPilot:'',
        helicopterRego:'',
        helicopterLandingZone:'',
        helicopterFlightDetails:'',
        startTime:'',
        finishTime:'',
        crewVehiclesOpen:false
      });
    }
  }

  toast('Helicopter ticked in Jobs');
}

function renderStatusChoices(){enforceWorkHourRules(entry);const list=[['normal','Normal'],['rdo','RDO'],['rdoWorked','RDO (Worked)'],['publicHoliday','Public Holiday'],['publicHolidayWorked','Public Holiday (Worked)'],['sickLeave','Sick Leave'],['annualLeave','Annual Leave']];const miss=!completion(entry).status;document.getElementById('statusChoices').innerHTML=list.map(([k,l])=>{const active=(k==='normal')?(isWorkDay(entry)&&!entry.flags.rdoWorked&&!entry.flags.publicHolidayWorked):!!entry.flags[k];return `<button class="choice ${active?'active':''} ${miss?'requiredMissing':''}" onclick="exclusiveStatus('${k}')">${l}${miss?'<span class="missingLabel">Required</span>':''}</button>`}).join('');const workBtn=document.getElementById('workThisDayBtn');if(workBtn){workBtn.classList.toggle('hidden',!isWeekendOffDay(entry));}const partBtn=document.getElementById('partDayBtn');if(partBtn)partBtn.classList.toggle('active',!!entry.flags.partDayLeave);const partBox=document.getElementById('partDayLeaveBox');if(partBox)partBox.classList.toggle('hidden',!entry.flags.partDayLeave);setState('statusState',completion(entry).status)}
function setPanelLocked(panelId,locked,msg){const panel=document.getElementById(panelId);if(!panel)return;const body=panel.querySelector('.panelBody');if(!body)return;let banner=body.querySelector(':scope > .lockBanner');if(locked){if(!banner){banner=document.createElement('div');banner.className='lockBanner';body.prepend(banner);}banner.innerHTML=esc(msg||lockReason())+'<br><button data-unlock type="button" onclick="handleUnlockTap()">Double tap Edit Day</button>';}else if(banner){banner.remove();}body.classList.toggle('lockedBody',!!locked);body.querySelectorAll('button,input,textarea,select').forEach(el=>{el.disabled=!!locked&&!el.hasAttribute('data-unlock')});}

function renderAccommodationSelect(){
  const box=document.getElementById('lahaAccommodationBox');
  const select=document.getElementById('accommodationSelect');
  if(!box||!select)return;
  box.classList.toggle('hidden',!entry.flags.laha);
  const list=Array.isArray(ACCOMMODATION)?ACCOMMODATION:[];
  select.innerHTML='<option value="">Select accommodation</option>'+list.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  select.value=entry.accommodation||'';
}
function setAccommodation(v){entry.accommodation=v;saveLocal();haptic('light')}

function renderHours(){enforceWorkHourRules(entry);const locked=isEntryLocked(entry);const ok=completion(entry).hours;setPanelLocked('hoursPanel',locked,lockReason(entry));const none=document.getElementById('noneAllowBtn');if(none){none.classList.toggle('active',!!entry.flags.noneAllowance);none.classList.toggle('requiredMissing',!ok&&!locked)}['allowances','helicopter','onCall','onCallWeekend','onCallPH','nightshift','laha','inconvenience','higherDuties'].forEach(k=>{const id={allowances:'allowBtn',helicopter:'heliBtn',onCall:'onCallBtn',onCallWeekend:'onCallWeekendBtn',onCallPH:'onCallPHBtn',nightshift:'nightshiftBtn',laha:'lahaBtn',inconvenience:'inconBtn',higherDuties:'higherBtn'}[k];const el=document.getElementById(id);if(el){el.classList.toggle('active',!!entry.flags[k]);el.classList.toggle('requiredMissing',!ok&&!locked)}});document.getElementById('allowanceDetails')?.classList.toggle('requiredMissing',false);renderAccommodationSelect();setState('hoursState',ok)}
function setState(id,ok){const el=document.getElementById(id);if(el){el.textContent=ok?'✓':'!';el.className='state '+(ok?'ok':'bad');const card=el.closest('.card');if(card){card.classList.toggle('sectionCard',true);card.classList.toggle('complete',!!ok);card.classList.toggle('incomplete',!ok);}}}

function getCrewVehicleSectionOpen(){
  const saved=getJSON(CREW_VEHICLE_SECTION_OPEN_KEY,null);
  if(saved&&typeof saved==='object')return {crew:saved.crew!==false,vehicles:saved.vehicles!==false};
  return {crew:true,vehicles:true};
}
function setCrewVehicleSectionOpen(v){setJSON(CREW_VEHICLE_SECTION_OPEN_KEY,v)}
function toggleCrewVehicleSection(which){
  const state=getCrewVehicleSectionOpen();
  state[which]=!state[which];
  setCrewVehicleSectionOpen(state);
  renderCrewVehicleSectionState();
  haptic('light');
}
function renderCrewVehicleSectionState(){
  const state=getCrewVehicleSectionOpen();
  const crew=document.getElementById('crewSectionCard');
  const vehicles=document.getElementById('vehicleSectionCard');
  if(crew)crew.classList.toggle('closed',!state.crew);
  if(vehicles)vehicles.classList.toggle('closed',!state.vehicles);
}

function getGroupOpenMap(){return getJSON(GROUP_OPEN_KEY,{})||{}}
function setGroupOpenMap(map){setJSON(GROUP_OPEN_KEY,map||{})}
function defaultOpenGroup(scope,group){
  const g=String(group||'').toLowerCase();
  if(scope==='dailyCrew'&&g==='team 1')return true;
  if(scope==='dailyVehicle'&&g==='team 1 vehicles')return true;
  return false;
}
function isGroupOpen(scope,group){const m=getGroupOpenMap();const k=scope+'::'+group;if(Object.prototype.hasOwnProperty.call(m,k))return !!m[k];return defaultOpenGroup(scope,group)}
function toggleGroupOpen(scope,g){const group=dec(g);const m=getGroupOpenMap();const k=scope+'::'+group;m[k]=!isGroupOpen(scope,group);setGroupOpenMap(m);renderCrewVehicles();renderSettingsManagers();haptic('light')}
function groupBoxHTML(scope,group,count,body,extraActions=''){
  const open=isGroupOpen(scope,group);
  return `<div class="groupBox ${open?'':'closed'}" data-drag-scope="${esc(scope)}" data-group="${enc(group)}"><div class="groupTitle" onclick="toggleGroupOpen('${scope}','${enc(group)}')"><div class="groupNameRow"><b>${esc(group)}</b><span>${count}</span></div>${extraActions?`<div class="groupActions" onclick="event.stopPropagation()">${extraActions}</div>`:''}</div><div class="groupBody">${body}</div></div>`;
}
function flatVehicleList(){
  const out=[];
  Object.keys(VEHICLE_GROUPS||{}).forEach(g=>{(VEHICLE_GROUPS[g]||[]).forEach(v=>{if(v&&!out.includes(v))out.push(v);});});
  (VEHICLE_NAMES||[]).forEach(v=>{if(v&&!out.includes(v))out.push(v);});
  return out;
}
function getCrewVehicleMemory(){return getJSON(CREW_VEHICLE_MEMORY_KEY,{})||{};}
function setCrewVehicleMemory(map){setJSON(CREW_VEHICLE_MEMORY_KEY,map||{});}
function rememberedVehicleForCrew(crew){const m=getCrewVehicleMemory();return m[crew]||'';}
function setVehicleForCrew(crew,vehicle){
  crew=dec(crew);vehicle=dec(vehicle);
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  const m=getCrewVehicleMemory();
  if(vehicle)m[crew]=vehicle; else delete m[crew];
  setCrewVehicleMemory(m);
  if(vehicle&&!entry.vehicles.includes(vehicle))entry.vehicles.push(vehicle);
  if(!entry.crew.includes(crew))entry.crew.push(crew);
  saveLocal();
}
function addCrewVehiclePair(crew,vehicle){
  return withPanelScrollLock('crewPanel',()=>{
  crew=dec(crew);vehicle=dec(vehicle);
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  if(crew&&!entry.crew.includes(crew))entry.crew.push(crew);
  if(vehicle&&!entry.vehicles.includes(vehicle))entry.vehicles.push(vehicle);
  if(crew&&vehicle){const m=getCrewVehicleMemory();m[crew]=vehicle;setCrewVehicleMemory(m);}
  saveLocal();

  });
}
function toggleCrewFast(x){
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  const crew=dec(x);
  if(entry.crew.includes(crew)){
    entry.crew=entry.crew.filter(a=>a!==crew);
  }else{
    entry.crew=[...entry.crew,crew];
    const v=rememberedVehicleForCrew(crew);
    if(v&&!entry.vehicles.includes(v))entry.vehicles.push(v);
  }
  saveLocal();
}
function recentCrewVehiclePairs(){
  const m=getCrewVehicleMemory();
  const crews=[];
  Object.keys(CREW_GROUPS||{}).forEach(g=>(CREW_GROUPS[g]||[]).forEach(c=>{if(c&&!crews.includes(c))crews.push(c);}));
  Object.keys(m||{}).forEach(c=>{if(c&&!crews.includes(c))crews.push(c);});
  return crews.filter(c=>m[c]).slice(0,12).map(c=>({crew:c,vehicle:m[c]}));
}
function crewInitials(name){
  return String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
}
function crewAllNames(){
  const out=[];
  Object.keys(CREW_GROUPS||{}).forEach(g=>(CREW_GROUPS[g]||[]).forEach(c=>{if(c&&!out.includes(c))out.push(c);}));
  (CREW_NAMES||[]).forEach(c=>{if(c&&!out.includes(c))out.push(c);});
  entry.crew.forEach(c=>{if(c&&!out.includes(c))out.push(c);});
  return out;
}
function vehicleForCrew(c){
  const remembered=rememberedVehicleForCrew(c);
  if(remembered)return remembered;
  return '';
}
function setCrewNotes(v){entry.crewNotes=String(v||'').slice(0,200);saveLocal();}
function toggleCrewPicker(){const el=document.getElementById('crewPickerClean');if(el)el.classList.toggle('open');}
function filterCrewPicker(q){
  q=String(q||'').toLowerCase();
  document.querySelectorAll('#crewPickerClean .crewPickerBtn').forEach(btn=>{
    const t=(btn.getAttribute('data-name')||'').toLowerCase();
    btn.style.display=t.includes(q)?'block':'none';
  });
}
function renderCrewVehicles(){
  const locked=isEntryLocked(entry);
  setPanelLocked('crewPanel',locked,lockReason(entry));
  const root=document.getElementById('crewCleanRoot');
  if(!root)return;
  const vehicles=flatVehicleList();
  const assignedCount=entry.crew.filter(c=>vehicleForCrew(c)).length;
  const ok=locked||(entry.crew.length>0&&assignedCount>0);
  const allCrew=crewAllNames();
  const pickerButtons=allCrew.length?allCrew.map(c=>{
    const active=entry.crew.includes(c);
    const v=rememberedVehicleForCrew(c);
    return `<button type="button" class="crewPickerBtn ${active?'active':''}" data-name="${escAttr(c)}" onclick="toggleCrewFast('${enc(c)}')"><b>${esc(c)}</b><small>${v?esc(v):(active?'Selected':'Tap to add')}</small></button>`;
  }).join(''):'<div class="crewPickerEmpty">No crew names yet. Add names in Settings.</div>';
  const rows=entry.crew.length?entry.crew.map(c=>{
    const current=vehicleForCrew(c);
    const opts='<option value="">Vehicle</option>'+vehicles.map(v=>`<option value="${escAttr(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
    return `<div class="crewRowClean">
      <div class="crewDragDots">⋮⋮</div>
      <div class="crewAvatar">${esc(crewInitials(c))}</div>
      <div class="crewNameBlock"><b>${esc(c)}</b><small>${current?'Assigned: '+esc(current):'No vehicle assigned'}</small></div>
      <select class="crewVehicleSelect" onchange="setVehicleForCrew('${enc(c)}',encodeURIComponent(this.value))">${opts}</select>
      <button type="button" class="crewDeleteBtn" onclick="removeCrew('${enc(c)}')">🗑</button>
    </div>`;
  }).join(''):'<div class="crewEmptyCard">No crew selected yet. Tap Add Crew.</div>';
  root.innerHTML=`
    <div class="crewReqPill ${ok?'ok':''}">${locked?'Crew locked':(ok?'Crew ready':'Crew required')}</div>
    <div class="crewCleanHeader"><div class="crewCleanTitle">Crew Members</div><button type="button" class="crewAddBtn" onclick="toggleCrewPicker()"><span>+</span> Add Crew</button></div>
    <div id="crewPickerClean" class="crewPickerClean">
      <input class="crewPickerSearch" placeholder="Search crew" oninput="filterCrewPicker(this.value)">
      <div class="crewPickerGrid">${pickerButtons}</div>
    </div>
    <div class="crewListClean">${rows}</div>
    <div class="crewSummaryClean"><div class="crewSummaryCard"><div class="crewSummaryIcon">✓</div><div class="crewSummaryText"><b>${entry.crew.length} Crew member${entry.crew.length===1?'':'s'}</b><span>${assignedCount} Vehicle${assignedCount===1?'':'s'} assigned</span></div></div></div>
    <div class="crewCleanTitle">Notes (Optional)</div>
    <div class="crewNotesBox"><textarea id="crewVehicleNotes" maxlength="200" placeholder="Add any notes about the crew or vehicles..." oninput="setCrewNotes(this.value)">${esc(entry.crewNotes||'')}</textarea><div class="crewNotesCount">${String(entry.crewNotes||'').length}/200</div></div>
    <button type="button" class="crewContinueBtn" onclick="saveLocal();closePanel()">Continue</button>
  `;
  const selectedCrew=document.getElementById('selectedCrew'); if(selectedCrew)selectedCrew.innerHTML='';
  const crewQuick=document.getElementById('crewQuick'); if(crewQuick)crewQuick.innerHTML='';
  const selectedVehicles=document.getElementById('selectedVehicles'); if(selectedVehicles)selectedVehicles.innerHTML='';
  const vehicleQuick=document.getElementById('vehicleQuick'); if(vehicleQuick)vehicleQuick.innerHTML='';
  setState('crewState',ok);
  setState('vehiclesState',ok);
  renderCrewVehicleSectionState();
}
function enc(s){return encodeURIComponent(s)}function dec(s){try{return decodeURIComponent(s||'')}catch{return s||''}}function toggleCrew(x){toggleCrewFast(x)}function toggleVehicle(x){if(isEntryLocked(entry)){toast(lockReason(entry));return;}x=dec(x);entry.vehicles=entry.vehicles.includes(x)?entry.vehicles.filter(a=>a!==x):[...entry.vehicles,x];saveLocal()}function addCrewFromInput(){return toggleCrewPicker()}function addVehicleFromInput(){return false}function removeCrew(x){if(isEntryLocked(entry)){toast(lockReason(entry));return;}const crew=dec(x);entry.crew=entry.crew.filter(a=>a!==crew);saveLocal()}function removeVehicle(x){if(isEntryLocked(entry)){toast(lockReason(entry));return;}entry.vehicles=entry.vehicles.filter(a=>a!==dec(x));saveLocal()}


function persistJobsOnlySafe(){
  if(isFuture(selectedDate))return;
  const entries=getEntries();
  entries[selectedDate]=entry;
  setEntries(entries);
  saveUI();
  try{debouncedAutoSync();}catch(e){}
}


function addJobHardFix(){
  try{
    if(isEntryLocked(entry)){
      toast(lockReason(entry));
      return;
    }
    if(!entry)entry=blankEntry(selectedDate);
    if(!Array.isArray(entry.jobs))entry.jobs=[];
    const newJob={
      id:'j'+Date.now()+Math.random().toString(36).slice(2),
      type:'',
      workOrder:'',
      lineName:'',
      faultDetails:'',
      description:'',
      helicopterPilot:'',
      helicopterRego:'',
      helicopterLandingZone:'',
      helicopterFlightDetails:'',
      poleType:'',
      poleTypeOther:'',
      switchingCircuit:'',
      switchingSubstation:'',
      switchingAction:'',
      switchingWorkOrder:'',
      switchingRows:[{swop:'',substation:''}],
      startTime:'',
      finishTime:'',
      crewVehiclesOpen:false
    };
    if(entry.flags&&entry.flags.helicopter)newJob.type='Helicopter';
    entry.jobs.push(newJob);
    try{entry.flags.overtime=calcDailyOT(entry)>0;}catch(e){}
    const entries=getEntries();
    entries[selectedDate]=entry;
    setEntries(entries);
    try{saveUI();}catch(e){}
    try{renderJobs();}catch(e){
      const list=document.getElementById('jobsList');
      if(list){
        list.innerHTML=entry.jobs.map((j,i)=>jobEditHTML(j,i)).join('');
      }
    }
    try{renderDashboard();}catch(e){}
    try{haptic('medium');}catch(e){}
    try{toast('Job added');}catch(e){}
    setTimeout(()=>{
      const card=document.querySelector('#jobsList .jobCard:last-child');
      if(card)card.scrollIntoView({block:'nearest'});
    },80);
  }catch(err){
    console.error('Add Job hard fix failed',err);
    alert('Could not add job: '+(err&&err.message?err.message:err));
  }
}

function addJob(){return addJobHardFix();}


function removeJob(id){if(isEntryLocked(entry)){toast(lockReason(entry));return;}entry.jobs=entry.jobs.filter(j=>j.id!==id);saveLocal();haptic('heavy')}
function updateJob(id,k,v){
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  j[k]=v;
  entry.flags.overtime=calcDailyOT(entry)>0;
  // Quiet save only. Do NOT call saveLocal/renderAll while typing in Jobs.
  // That old redraw loop caused the page to jump and wiped Pole Type Other.
  persistEntryNoRender();
  debouncedAutoSync();
}
function renderJobs(){const locked=isEntryLocked(entry);setPanelLocked('jobsPanel',locked,lockReason(entry));setState('jobsState',completion(entry).jobs);if(locked)document.getElementById('jobsList').innerHTML='<div class="bubble good">Jobs not required for this day type</div>';else if(!entry.jobs.length)document.getElementById('jobsList').innerHTML='<div class="bubble bad">Add at least one job</div>';else document.getElementById('jobsList').innerHTML=entry.jobs.map((j,i)=>jobEditHTML(j,i)).join('')}


function jobTrackerLabel(j,i){
  const types=jobTypeList(j);
  const type=types.length?types.join('+'):'Blank';
  const ref=String(j.workOrder||j.switchingWorkOrder||j.poleNumber||j.lineName||j.switchingSubstation||'').trim();
  return `Job ${i+1}: ${type}${ref?' · '+ref:''}`;
}
function renderJobTracker(activeId){
  const tracker=document.getElementById('jobTracker');
  if(!tracker)return;
  if(!entry.jobs||!entry.jobs.length){tracker.classList.add('hidden');tracker.innerHTML='';return;}
  const active=activeId||entry.jobs[0].id;
  const activeIndex=Math.max(0,entry.jobs.findIndex(j=>j.id===active));
  const activeJob=entry.jobs[activeIndex]||entry.jobs[0];
  tracker.classList.remove('hidden');
  tracker.innerHTML=`<div class="jobTrackerTop"><div id="jobTrackerTitle" class="jobTrackerTitle">${esc(jobTrackerLabel(activeJob,activeIndex))}</div><div class="jobTrackerCount">${entry.jobs.length} job${entry.jobs.length===1?'':'s'}</div></div><div class="jobJumpRow">${entry.jobs.map((j,i)=>`<button type="button" class="jobJumpChip ${j.id===active?'active':''}" onclick="jumpToJob('${escAttr(j.id)}')">${i+1} ${esc(jobTypeList(j)[0]||'Job')}</button>`).join('')}</div>`;
}
function setActiveJobTracker(id){
  if(!entry||!Array.isArray(entry.jobs))return;
  const idx=entry.jobs.findIndex(j=>String(j.id)===String(id));
  if(idx<0)return;
  const title=document.getElementById('jobTrackerTitle');
  if(title)title.textContent=jobTrackerLabel(entry.jobs[idx],idx);
  document.querySelectorAll('#jobsList .jobCard').forEach(c=>c.classList.toggle('jobActive',String(c.dataset.jobId||'')===String(id)));
  document.querySelectorAll('#jobTracker .jobJumpChip').forEach((b,i)=>b.classList.toggle('active',i===idx));
}
function jobCardById(id){
  return Array.from(document.querySelectorAll('#jobsList .jobCard')).find(c=>String(c.dataset.jobId||'')===String(id));
}
function jumpToJob(id){
  const card=jobCardById(id);
  const scroller=document.querySelector('#jobsPanel .panelBody');
  if(!card||!scroller)return;
  setActiveJobTracker(id);
  const tracker=document.getElementById('jobTracker');
  const offset=(tracker?tracker.offsetHeight:0)+18;
  const target=scroller.scrollTop + card.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset;
  scroller.scrollTo({top:Math.max(0,target),behavior:'smooth'});
  haptic('light');
}
let jobTrackerObserver=null;
function initJobTrackerObserver(){
  if(jobTrackerObserver){try{jobTrackerObserver.disconnect();}catch(e){}}
  jobTrackerObserver=null;
  const cards=Array.from(document.querySelectorAll('#jobsList .jobCard'));
  if(!cards.length)return;
  cards.forEach(c=>{
    const id=c.dataset.jobId;
    c.addEventListener('pointerenter',()=>setActiveJobTracker(id),{passive:true});
    c.addEventListener('focusin',()=>setActiveJobTracker(id),{passive:true});
    c.addEventListener('touchstart',()=>setActiveJobTracker(id),{passive:true});
  });
  setActiveJobTracker(cards[0].dataset.jobId);
}

const JOB_TYPE_OPTIONS=['Pole','Project','General','Faults','Helicopter','Switching'];

const POLE_TYPE_OPTIONS=['Fir Tree','Strain','Pi','Cruciform','Stay','Flying Angle','Main-Arm Buck-Arm','Steel Pole','Cricket Wicket','Other'];
function poleTypeOptionsHTML(value){
  return '<option value="">Select pole type</option>'+POLE_TYPE_OPTIONS.map(t=>`<option value="${esc(t)}" ${String(value||'')===t?'selected':''}>${esc(t)}</option>`).join('');
}
function poleTypeHTML(j){
  if(!jobHasType(j,'Pole'))return '';
  const isOther=String(j.poleType||'')==='Other';
  const otherText=String(j.poleTypeOther||'');
  const missing=!j.poleType||(isOther&&!otherText.trim());
  const otherId='poleOther_'+String(j.id||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const wrapId='poleOtherWrap_'+String(j.id||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  return `<div class="heliRequiredBox poleRebuildBox ${missing?'requiredMissing':''}">
    <div class="jobTitle">Pole Details ${missing?'<span class="missingLabel">Required</span>':''}</div>
    <label>Pole Type ${!j.poleType?'<span class="missingLabel">Required</span>':''}</label>
    <select class="${!j.poleType?'requiredMissing':''}" onchange="setPoleType('${j.id}',this.value)">${poleTypeOptionsHTML(j.poleType)}</select>
    <div id="${wrapId}" style="display:${isOther?'block':'none'}">
      <label>Other Pole Type ${isOther&&!otherText.trim()?'<span class="missingLabel">Required</span>':''}</label>
      <input id="${otherId}" class="${isOther&&!otherText.trim()?'requiredMissing':''}" value="${esc(otherText)}" placeholder="Type pole type here" oninput="updateJob('${j.id}','poleTypeOther',this.value)">
    </div>
  </div>`;
}
function setPoleType(id,type){
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  j.poleType=type;
  const safeId=String(id||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const wrap=document.getElementById('poleOtherWrap_'+safeId);
  const input=document.getElementById('poleOther_'+safeId);

  // Keep the Pole Type dropdown on screen. Only reveal/hide the extra Other field.
  // No full jobs redraw here, because redraws are what caused the page jump.
  if(type==='Other'){
    if(wrap)wrap.style.display='block';
    if(input)setTimeout(()=>input.focus({preventScroll:true}),20);
  }else{
    j.poleTypeOther='';
    if(input)input.value='';
    if(wrap)wrap.style.display='none';
  }

  persistEntryNoRender();
  debouncedAutoSync();
}

function jobTypeList(j){
  return String(j.type||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function jobHasType(j,t){
  return jobTypeList(j).map(x=>x.toLowerCase()).includes(String(t).toLowerCase());
}
function toggleJobType(id,type){
  if(isEntryLocked(entry)){toast(lockReason(entry));return;}
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  let list=jobTypeList(j);
  const idx=list.findIndex(x=>x.toLowerCase()===String(type).toLowerCase());
  if(idx>=0){
    list.splice(idx,1);
    if(String(type).toLowerCase()==='faults')j.faultDetails='';
    if(String(type).toLowerCase()==='pole'){j.poleType='';j.poleTypeOther='';}
    if(String(type).toLowerCase()==='switching'){j.switchingCircuit='';j.switchingSubstation='';j.switchingAction='';j.switchingWorkOrder='';j.switchingRows=[];}
  }else{
    if(String(type).toLowerCase()==='switching'){
      const other=entry.jobs.find(x=>x.id!==id&&jobHasType(x,'Switching'));
      if(other){toast('Only one Switching job allowed');return;}
      if(!Array.isArray(j.switchingRows)||!j.switchingRows.length)j.switchingRows=[{swop:'',substation:''}];
    }
    list.push(type);
  }
  j.type=list.join(', ');
  const body=document.querySelector('#jobsPanel .panelBody');
  const y=body?body.scrollTop:0;
  persistEntryNoRender();
  renderJobs();
  if(body)requestAnimationFrame(()=>{body.scrollTop=y;});
  debouncedAutoSync();
}
function jobTypesHTML(j){
  const missing=!j.type;
  return `<label>Job Type ${missing?'<span class="missingLabel">Required</span>':''}</label><div class="jobTypeGrid ${missing?'requiredMissing':''}">`+
    JOB_TYPE_OPTIONS.map(t=>`<button type="button" class="jobTypeBtn ${jobHasType(j,t)?'active':''} ${missing?'requiredMissing':''}" onclick="toggleJobType('${j.id}','${t}')">${t}</button>`).join('')+
  `</div>`;
}
function helicopterRequiredForJob(j){
  return !!(entry.flags.helicopter||jobHasType(j,'Helicopter'));
}
function helicopterCompleteForJob(j){
  return !!(String(j.workOrder||'').trim()&&String(j.lineName||'').trim()&&String(j.helicopterFlightDetails||'').trim()&&String(j.helicopterPilot||'').trim()&&String(j.helicopterRego||'').trim());
}
function helicopterHTML(j){
  if(!jobHasType(j,'Helicopter'))return '';
  const missing=!helicopterCompleteForJob(j);
  return `<div class="heliRequiredBox ${missing?'requiredMissing':''}">
    <div class="jobTitle">Helicopter Patrol ${missing?'<span class="missingLabel">Required</span>':''}</div>

    <label>INCD/WO Number ${!String(j.workOrder||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <input class="${!String(j.workOrder||'').trim()?'requiredMissing':''}" value="${esc(j.workOrder||'')}" placeholder="INCD / WO number" oninput="updateJob('${j.id}','workOrder',this.value)">

    <label>Line Patrolled ${!String(j.lineName||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <select class="${!String(j.lineName||'').trim()?'requiredMissing':''}" onchange="updateJob('${j.id}','lineName',this.value)">${circuitOptionsHTML(j.lineName).replace('Select transmission circuit','Select line patrolled')}</select>

    <label>Flight Time ${!String(j.helicopterFlightDetails||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <input class="${!String(j.helicopterFlightDetails||'').trim()?'requiredMissing':''}" value="${esc(j.helicopterFlightDetails||'')}" placeholder="e.g. 2.5 hrs / 0730-1030" oninput="updateJob('${j.id}','helicopterFlightDetails',this.value)">

    <label>Pilot Name ${!String(j.helicopterPilot||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <input class="${!String(j.helicopterPilot||'').trim()?'requiredMissing':''}" value="${esc(j.helicopterPilot||'')}" placeholder="Pilot name" oninput="updateJob('${j.id}','helicopterPilot',this.value)">

    <label>Vehicle / Helicopter Rego ${!String(j.helicopterRego||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <input class="${!String(j.helicopterRego||'').trim()?'requiredMissing':''}" value="${esc(j.helicopterRego||'')}" placeholder="Aircraft rego / vehicle" oninput="updateJob('${j.id}','helicopterRego',this.value)">

    <label>Notes</label>
    <textarea placeholder="Helicopter notes..." oninput="updateJob('${j.id}','description',this.value)">${esc(j.description||'')}</textarea>
  </div>`;
}
function switchingRowsForJob(j){
  if(!Array.isArray(j.switchingRows)||!j.switchingRows.length)j.switchingRows=[{swop:'',substation:''}];
  j.switchingRows=j.switchingRows.map(r=>({swop:r?.swop||'',substation:r?.substation||''}));
  return j.switchingRows;
}
function switchingRowsComplete(j){
  if(!jobHasType(j,'Switching'))return true;
  const rows=switchingRowsForJob(j);
  return !!String(j.switchingSubstation||'').trim() &&
         !!String(j.switchingAction||'').trim() &&
         !!String(j.switchingWorkOrder||'').trim() &&
         rows.length>0 && rows.every(r=>String(r.swop||'').trim()&&String(r.substation||'').trim());
}
function addSwitchingRow(id){
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  j.switchingRows=switchingRowsForJob(j);
  j.switchingRows.push({swop:'',substation:''});
  saveLocal();
  toast('SWOP + substation row added');
}
function removeSwitchingRow(id,idx){
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  j.switchingRows=switchingRowsForJob(j);
  if(j.switchingRows.length<=1){
    j.switchingRows=[{swop:'',substation:''}];
  }else{
    j.switchingRows.splice(idx,1);
  }
  saveLocal();
}
function updateSwitchingRow(id,idx,key,value){
  const j=entry.jobs.find(x=>x.id===id);
  if(!j)return;
  j.switchingRows=switchingRowsForJob(j);
  if(!j.switchingRows[idx])j.switchingRows[idx]={swop:'',substation:''};
  j.switchingRows[idx][key]=value;
  saveLocal();
}
function switchingHTML(j){
  if(!jobHasType(j,'Switching'))return '';
  const rows=switchingRowsForJob(j);
  const missing=!switchingRowsComplete(j);
  const swopOptionsFor=(val)=>(Array.isArray(SWOPS)?SWOPS:[]).map(x=>`<option value="${esc(x)}" ${String(val||'')===x?'selected':''}>${esc(x)}</option>`).join('');
  const subOptionsFor=(val)=>(Array.isArray(SUBSTATIONS)?SUBSTATIONS:[]).map(x=>`<option value="${esc(x)}" ${String(val||'')===x?'selected':''}>${esc(x)}</option>`).join('');
  return `<div class="switchingBox ${missing?'requiredMissing':''}">
    <div class="jobTitle">Switching Details ${missing?'<span class="missingLabel">Required</span>':''}</div>
    <p class="rateHint">Switching uses its own fields. It does not use the normal Work Order or Transmission Circuit fields.</p>

    <label>Substation ${!String(j.switchingSubstation||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <select class="${!String(j.switchingSubstation||'').trim()?'requiredMissing':''}" onchange="updateJob('${j.id}','switchingSubstation',this.value)">
      <option value="">Select substation</option>${subOptionsFor(j.switchingSubstation)}
    </select>

    <label>Restoration or Isolation ${!String(j.switchingAction||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <select class="${!String(j.switchingAction||'').trim()?'requiredMissing':''}" onchange="updateJob('${j.id}','switchingAction',this.value)">
      <option value="">Select</option>
      <option value="Restoration" ${j.switchingAction==='Restoration'?'selected':''}>Restoration</option>
      <option value="Isolation" ${j.switchingAction==='Isolation'?'selected':''}>Isolation</option>
    </select>

    <label>Substation Work Order ${!String(j.switchingWorkOrder||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
    <input class="${!String(j.switchingWorkOrder||'').trim()?'requiredMissing':''}" value="${esc(j.switchingWorkOrder||'')}" placeholder="Substation work order" oninput="updateJob('${j.id}','switchingWorkOrder',this.value)">

    <div class="settingsDivider"></div>
    <div class="jobTitle">Other Switching Operator</div>`+
    rows.map((r,idx)=>`<div class="switchingRow">
      <div><label>Other SWOP ${!String(r.swop||'').trim()?'<span class="missingLabel">Required</span>':''}</label><select class="${!String(r.swop||'').trim()?'requiredMissing':''}" onchange="updateSwitchingRow('${j.id}',${idx},'swop',this.value)"><option value="">Select other SWOP</option>${swopOptionsFor(r.swop)}</select></div>
      <div><label>Substation ${!String(r.substation||'').trim()?'<span class="missingLabel">Required</span>':''}</label><select class="${!String(r.substation||'').trim()?'requiredMissing':''}" onchange="updateSwitchingRow('${j.id}',${idx},'substation',this.value)"><option value="">Select substation</option>${subOptionsFor(r.substation)}</select></div>
      <button type="button" class="danger small" onclick="removeSwitchingRow('${j.id}',${idx})">Remove</button>
    </div>`).join('')+
    `<button type="button" class="primary" style="width:100%;margin-top:10px" onclick="addSwitchingRow('${j.id}')">Add another SWOP + Substation</button>
    </div>`;
}
function circuitOptionsHTML(value){
  const list=Array.isArray(CIRCUITS)?CIRCUITS:[];
  return '<option value="">Select transmission circuit</option>'+list.map(x=>`<option value="${esc(x)}" ${String(value||'')===x?'selected':''}>${esc(x)}</option>`).join('');
}

function jobEditHTML(j,i){
  const fault=jobHasType(j,'Faults')||String(j.type||'').toLowerCase().includes('fault');
  const isHeli=jobHasType(j,'Helicopter');
  const isSwitching=jobHasType(j,'Switching');
  const dailyOT=calcDailyOT(entry);
  const normalFields=!isHeli&&!isSwitching;
  return `<div class="jobCard">
    <div class="jobTop"><div class="jobTitle">Job ${i+1}</div><button class="danger small" onclick="removeJob('${j.id}')">Remove</button></div>
    <div class="jobTimeSummary"><b>Time record</b><span class="otBadge ${dailyOT>0?'on':''}">${dailyOT>0?'OT Auto':'No OT'}</span></div>
    <div class="jobTimeRow">
      <div><label>Start Time</label><input type="time" value="${esc(j.startTime)}" onchange="updateJob('${j.id}','startTime',this.value)"></div>
      <div><label>Finish Time</label><input type="time" value="${esc(j.finishTime)}" onchange="updateJob('${j.id}','finishTime',this.value)"></div>
    </div>
    ${jobTypesHTML(j)}
    ${isHeli?helicopterHTML(j):''}
    ${isSwitching?switchingHTML(j):''}
    ${normalFields?poleTypeHTML(j):''}
    ${normalFields?`<label>Work Order ${!j.workOrder?'<span class="missingLabel">Required</span>':''}</label><input class="${!j.workOrder?'requiredMissing':''}" value="${esc(j.workOrder)}" placeholder="WO / number" oninput="updateJob('${j.id}','workOrder',this.value)">`:''}
    ${normalFields?`<label>Transmission Circuit ${!j.lineName?'<span class="missingLabel">Required</span>':''}</label><select class="${!j.lineName?'requiredMissing':''}" onchange="updateJob('${j.id}','lineName',this.value)">${circuitOptionsHTML(j.lineName)}</select>`:''}
    ${normalFields&&fault?`<label>Faults ${!j.faultDetails?'<span class="missingLabel">Required</span>':''}</label><input class="${!j.faultDetails?'requiredMissing':''}" value="${esc(j.faultDetails)}" placeholder="Fault details" oninput="updateJob('${j.id}','faultDetails',this.value)">`:''}
    ${normalFields?`<label>Description ${!j.description?'<span class="missingLabel">Required</span>':''}</label><textarea class="${!j.description?'requiredMissing':''}" placeholder="Work completed..." oninput="updateJob('${j.id}','description',this.value)">${esc(j.description)}</textarea>`:''}
  </div>`;
}
function persistEntryNoRender(){const entries=getEntries();entries[selectedDate]=entry;setEntries(entries);saveUI();}
function handleUnlockTap(){
  const now=Date.now();
  if(now-lastUnlockTap<550){lastUnlockTap=0;unlockDay();return;}
  lastUnlockTap=now;
  toast('Double tap to unlock');
  haptic('light');
}
function toggleSettingsBlock(id){
  const target=document.getElementById('settingsBlock_'+id);
  if(!target)return;
  const wasOpen=target.classList.contains('open');
  document.querySelectorAll('#settingsPanel .settingsBlock').forEach(b=>b.classList.remove('open'));
  if(!wasOpen)target.classList.add('open');
  haptic('light');
}

function unlockDay(){entry.locked=false;entry.manualUnlock=true;persistEntryNoRender();toast('Day unlocked for editing');haptic('medium');renderAll(false);}
function lockDay(){entry.manualUnlock=false;entry.locked=true;persistEntryNoRender();toast('Day locked');haptic('medium');renderAll(false);}
function tapCalendarDay(date){
  const now=Date.now();
  if(lastTap.date===date && now-lastTap.time<450){
    selectDate(date);
    closePanel();
  }else{
    showCalendarDayInfo(date);
    lastTap={date,time:now};
    haptic('light');
  }
}

function renderCalendar(){
  const grid=document.getElementById('calendarGrid');
  if(!grid)return;
  const monthTitle=document.getElementById('calendarMonth');
  monthTitle.textContent=calendarDate.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth();
  const first=new Date(y,m,1);
  const start=(first.getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  let html=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="calHead">${d}</div>`).join('');
  for(let i=0;i<start;i++)html+='<div class="calDay blank"></div>';
  const entries=getEntries();
  const suggested=suggestNextRestDay(selectedDate);
  for(let d=1;d<=days;d++){
    const key=iso(new Date(y,m,d,12));
    const e=migrate(entries[key],key);
    const fs=fatigueStatusForDate(key);
    let fatigueCls='';
    if(fs.cls==='breach')fatigueCls+=' fatigueNeed';
    else if(fs.cls==='warn')fatigueCls+=' fatigueNear';
    if(getLastAllowedWorkDay()===key)fatigueCls+=' lastWorkDay';
    const cls=calendarClass(e)+(isRosterRDODate(key)?' rosterRdo':'')+(e.flags.nightshift?' night':'')+fatigueCls+(isFuture(key)?' future':'')+(key===selectedDate?' selected':'')+(!completion(e).status||!completion(e).hours||!completion(e).crewVehicles||!completion(e).jobs?' incomplete':'');
    html+=`<button class="calDay ${cls}" onclick="calendarTap('${key}')">${d}</button>`
  }
  grid.innerHTML=html
}
function calendarClass(e){if(e.flags.rdoWorked)return 'rdoWorked';if(e.flags.publicHolidayWorked)return 'phWorked';if(e.flags.rdo)return 'rdo';if(e.flags.sickLeave)return 'sick';if(e.flags.annualLeave)return 'leave';if(e.flags.publicHoliday)return 'ph';if(isWorkDay(e))return 'work';return ''}
function calendarTap(key){
  const now=Date.now();
  if(lastTap.date===key && now-lastTap.time<450){
    selectDate(key);
    closePanel();
    toast('Loaded '+niceDate(key));
  }else{
    lastTap={date:key,time:now};
    showCalendarDayInfo(key);
    haptic('light');
  }
}
function changeMonth(n){calendarDate.setMonth(calendarDate.getMonth()+n);renderCalendar()}
function getWeekStart(d){const x=new Date(d);const day=x.getDay();x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
function changeWeek(n){const next=new Date(weekStart);next.setDate(next.getDate()+n*7);if(next>getWeekStart(new Date())){toast('Future weeks locked');return}weekStart=next;renderWeekly()}
function calcHours(s,f){s=String(s||'');f=String(f||'');if(s.length<3||f.length<3)return 0;const sm=Math.floor(+s/100)*60+(+s%100), fm=Math.floor(+f/100)*60+(+f%100);let diff=fm-sm;if(diff<0)diff+=1440;return diff/60}

function timeToMinutes(v){if(!v)return null;v=String(v).trim();if(v.includes(':')){const [h,m]=v.split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null;}if(/^\d{3,4}$/.test(v)){v=v.padStart(4,'0');return Number(v.slice(0,2))*60+Number(v.slice(2));}return null;}
function calcJobHours(j){const s=timeToMinutes(j.startTime||j.start),f=timeToMinutes(j.finishTime||j.end);if(s===null||f===null)return 0;let diff=f-s;if(diff<0)diff+=24*60;return diff/60;}
function totalJobHours(e){return (e.jobs||[]).reduce((sum,j)=>sum+calcJobHours(j),0);}
function calcDailyOT(e){e=enforceWorkHourRules(migrate(e,e?.date||selectedDate));const total=totalJobHours(e);if(e.flags.publicHolidayWorked)return total>0?total:calcHours(e.overtimeStart,e.overtimeFinish);if(total>0&&isWeekendNormalWorked(e))return total;if(total>0&&hasNormalHours(e))return Math.max(0,total-STD_HOURS);return calcHours(e.overtimeStart,e.overtimeFinish);}
function weekTotals(){const entries=getEntries();let normal=0,ot=0,jobs=0,onCall=0,laha=0,incon=0,higher=0,allow=0;for(let i=0;i<7;i++){const key=iso(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+i,12));const e=migrate(entries[key],key);if(normalHoursForPay(e))normal+=STD_HOURS;ot+=calcDailyOT(e);jobs+=e.jobs.length;if(e.flags.onCall)onCall++;if(e.flags.laha)laha++;if(e.flags.inconvenience)incon++;if(e.flags.higherDuties)higher++;if(e.flags.allowances)allow++;}return {normal,ot,jobs,onCall,laha,incon,higher,allow}}
function weekTiny(){const t=weekTotals();return `${t.normal.toFixed(1)}h · ${t.ot.toFixed(1)} OT`}
function renderWeekly(){
  const rows=document.getElementById('weeklyRows');
  if(!rows)return;
  const end=new Date(weekStart);
  end.setDate(end.getDate()+6);
  document.getElementById('weekRange').textContent=`${niceDate(iso(weekStart))} - ${niceDate(iso(end))}`;
  const nextBtn=document.getElementById('nextWeekBtn');
  if(nextBtn)nextBtn.disabled=weekStart>=getWeekStart(new Date());
  const q=(document.getElementById('weekSearch')?.value||'').toLowerCase();
  const entries=getEntries();
  let html='', normalTotal=0, otTotal=0;
  for(let i=0;i<7;i++){
    const key=iso(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+i,12));
    const e=migrate(entries[key],key);
    const normal=normalHoursForPay(e)?STD_HOURS:0;
    const ot=calcDailyOT(e)||0;
    normalTotal+=normal;
    otTotal+=ot;
    const text=JSON.stringify(e).toLowerCase();
    if(q&& !text.includes(q))continue;
    const comp=missingList(e).length===0;
    const extra=[];
    if(e.flags.laha)extra.push('LAHA');
    if(e.flags.inconvenience)extra.push('Inconvenience');
    if(e.flags.onCall)extra.push('On-call');
    if(e.flags.nightshift)extra.push('Nightshift');
    if(e.flags.higherDuties)extra.push('Higher Duties');
    if(e.flags.allowances)extra.push('Allowance');
    const stateClass=comp?'state ok':'state bad';
    const stateText=comp?'✓':'!';
    html+=`<div class="weekRow"><div class="weekLine" onclick="this.closest('.weekRow').classList.toggle('open');haptic('light')"><span>${niceDate(key).replace(' ','<br>')}</span><span>${statusText(e)}</span><span>${normal?normal.toFixed(1):'—'}</span><span>${ot?ot.toFixed(1):'—'}</span><span>${'●'.repeat(Math.min(e.jobs.length,3))||'—'}</span><span class="${stateClass}">${stateText}</span></div><div class="expand">${extra.length?`<div class="bubbles">${extra.map(x=>`<span class="bubble good">${x}</span>`).join('')}</div>`:''}${dayDetailsHTML(e)}</div></div>`;
  }
  const normalEl=document.getElementById('weekNormalTotal');
  const otEl=document.getElementById('weekOTTotal');
  if(normalEl)normalEl.textContent=normalTotal.toFixed(1);
  if(otEl)otEl.textContent=otTotal.toFixed(1);
  rows.innerHTML=html||'<div class="bubble bad">No matching days</div>';
}
function dayDetailsHTML(e){let html=`<div class="readLine"><b>Status</b><span>${statusText(e)}</span></div><div class="readLine"><b>Allowances</b><span>${hourSummary(e).sub}</span></div><details><summary style="font-weight:900;margin:8px 0">Crew + Vehicles</summary><div class="readLine"><b>Crew</b><span>${e.crew.join(', ')||'—'}</span></div><div class="readLine"><b>Vehicles</b><span>${e.vehicles.join(', ')||'—'}</span></div></details>`;if(!e.jobs.length)html+='<div class="bubble bad">No jobs entered</div>';e.jobs.forEach((j,i)=>{html+=`<div class="jobRead"><div style="font-weight:950;margin-bottom:6px">${esc(j.type||'Job '+(i+1))}</div><div class="readLine"><b>Work Order</b><span>${esc(j.workOrder)||'—'}</span></div><div class="readLine"><b>Line Name</b><span>${esc(j.lineName)||'—'}</span></div><div class="readLine"><b>Time</b><span>${esc(j.startTime)||'—'} - ${esc(j.finishTime)||'—'}${calcJobHours(j)?' · '+calcJobHours(j).toFixed(1)+'h':''}</span></div><div class="readLine"><b>Faults</b><span>${esc(j.faultDetails)||'—'}</span></div><div class="readLine"><b>Description</b><span class="desc">${esc(j.description)||'—'}</span></div></div>`});return html}
function copyWeekSummary(){const text=document.getElementById('weeklyRows').innerText;navigator.clipboard?.writeText(text);toast('Week copied');haptic('medium')}
function exportWeekSummary(){const blob=new Blob([document.getElementById('weeklyRows').innerText],{type:'text/plain'});downloadBlob(blob,'week-summary.txt')}
function openDailySummary(){renderDailySummary();openPanel('dailySummaryPanel')}
function renderDailySummary(){const miss=missingList(entry);let html=`<div class="summaryStatus ${miss.length?'bad':'ok'}">${miss.length?'Incomplete':'✓ Completed'}</div>`;if(miss.length)html+=`<div class="card"><b>Outstanding</b><div class="bubbles">${miss.map(x=>`<span class="bubble bad">${x}</span>`).join('')}</div></div>`;html+=`<div class="card"><h3>${niceDate(selectedDate)}</h3>${dayDetailsHTML(entry)}</div>`;document.getElementById('dailySummaryContent').innerHTML=html}
function paySettings(){return getJSON(PAY_KEY,{base:0,ot:0,onCall:0,onCallWeekend:0,onCallPH:0,nightshift:0,laha:0,incon:0,higher:0,allow:0})}
function calcPay(){const d=calcPayDetailed();return {gross:d.gross,net:d.net}}
function money(n){return '$'+(Number(n)||0).toLocaleString('en-AU',{maximumFractionDigits:0})}
function getPayPeriodStart(d){const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay();x.setDate(x.getDate()-day);return x}
function isSundayKey(key){return new Date(key+'T12:00:00').getDay()===0}
function splitOTForDate(key,otHours){const e=migrate(getEntries()[key],key);if(isSundayKey(key)||e.flags.publicHolidayWorked)return {ot15:0,ot2:otHours};return {ot15:Math.min(2,otHours),ot2:Math.max(0,otHours-2)}}
function payPeriodTotals(){const entries=getEntries();const start=getPayPeriodStart(new Date(selectedDate+'T12:00:00'));let normal=0,ot=0,ot15=0,ot2=0,jobs=0,onCall=0,onCallWeekend=0,onCallPH=0,nightshift=0,laha=0,incon=0,higher=0,allow=0;for(let i=0;i<7;i++){const key=iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));const e=migrate(entries[key],key);if(normalHoursForPay(e))normal+=STD_HOURS;const dOt=calcDailyOT(e);const split=splitOTForDate(key,dOt);ot+=dOt;ot15+=split.ot15;ot2+=split.ot2;jobs+=e.jobs.length;if(e.flags.onCall)onCall++;if(e.flags.onCallWeekend)onCallWeekend++;if(e.flags.onCallPH)onCallPH++;if(e.flags.nightshift)nightshift++;if(e.flags.laha)laha++;if(e.flags.inconvenience)incon++;if(e.flags.higherDuties)higher++;if(e.flags.allowances)allow++;}return {start,normal,ot,ot15,ot2,jobs,onCall,onCallWeekend,onCallPH,nightshift,laha,incon,higher,allow}}
function residentAnnualTax2025_26(income){income=Math.max(0,Number(income)||0);let tax=0;if(income<=18200)tax=0;else if(income<=45000)tax=(income-18200)*0.16;else if(income<=135000)tax=4288+(income-45000)*0.30;else if(income<=190000)tax=31288+(income-135000)*0.37;else tax=51638+(income-190000)*0.45;return tax+income*0.02}
function calcPayDetailed(){const p=paySettings(),t=payPeriodTotals();const normal=t.normal*p.base;const overtime15=t.ot15*p.base*1.5;const overtime2=t.ot2*p.base*2;const overtime=overtime15+overtime2;const onCall=t.onCall*p.onCall;const onCallWeekend=t.onCallWeekend*p.onCallWeekend;const onCallPH=t.onCallPH*p.onCallPH;const nightshift=t.nightshift*p.nightshift;const laha=t.laha*p.laha;const incon=t.incon*p.incon;const higher=t.higher*p.higher;const allow=t.allow*p.allow;const gross=normal+overtime+onCall+onCallWeekend+onCallPH+nightshift+laha+incon+higher+allow;const annualGross=gross*52;const taxAmt=residentAnnualTax2025_26(annualGross)/52;return {t,normal,overtime15,overtime2,overtime,onCall,onCallWeekend,onCallPH,nightshift,laha,incon,higher,allow,gross,annualGross,taxAmt,net:gross-taxAmt}}

const PAYSLIP_CHECK_KEY='field_diary_payslip_check_v1';
function payslipCheck(){return getJSON(PAYSLIP_CHECK_KEY,{gross:'',net:''})||{gross:'',net:''}}
function savePayslipCheck(){const g=document.getElementById('payslipGross')?.value||'';const n=document.getElementById('payslipNet')?.value||'';setJSON(PAYSLIP_CHECK_KEY,{gross:g,net:n})}
function loadPayslipCheck(){const p=payslipCheck();const g=document.getElementById('payslipGross');const n=document.getElementById('payslipNet');if(g&&document.activeElement!==g)g.value=p.gross||'';if(n&&document.activeElement!==n)n.value=p.net||''}
function isWeekdayISO(key){const d=new Date(key+'T12:00:00').getDay();return d>=1&&d<=5}
function expectedRosterHoursForPeriod(start){let h=0,rdoDays=0,phDays=0;const entries=getEntries();for(let i=0;i<7;i++){const key=iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));const e=migrate(entries[key],key);if(isWeekdayISO(key)){if(isRosterRDODate(key)||e.flags.rdo){rdoDays++;continue;}h+=STD_HOURS;if(e.flags.publicHoliday||e.flags.publicHolidayWorked)phDays++;}}return {hours:h,rdoDays,phDays}}
function expectedPayForPeriod(t){const p=paySettings();const exp=expectedRosterHoursForPeriod(t.start);const normal=exp.hours*p.base;const taxAmt=residentAnnualTax2025_26(normal*52)/52;return {...exp,gross:normal,taxAmt,net:normal-taxAmt}}
function publicHolidayBreakdownForPeriod(start){const entries=getEntries();let baseHours=0,workedHours=0,basePay=0,penaltyPay=0;const p=paySettings();for(let i=0;i<7;i++){const key=iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));const e=migrate(entries[key],key);if(e.flags.publicHoliday||e.flags.publicHolidayWorked){baseHours+=STD_HOURS;basePay+=STD_HOURS*p.base;}if(e.flags.publicHolidayWorked){const h=totalJobHours(e)||calcHours(e.overtimeStart,e.overtimeFinish)||STD_HOURS;workedHours+=h;penaltyPay+=h*p.base*2;}}return {baseHours,workedHours,basePay,penaltyPay,total:basePay+penaltyPay}}
function allowanceTotal(e){return e.onCall+e.nightshift+e.laha+e.incon+e.higher+e.allow}

function fatigueSettings(){
  const s=getJSON(FATIGUE_KEY,{})||{};
  return {maxDay:Number(s.maxDay)||12,maxWeek:Number(s.maxWeek)||60,maxFortnight:Number(s.maxFortnight)||120};
}
function saveFatigueSettings(){
  const s={maxDay:+(document.getElementById('fatigueMaxDay')?.value||12),maxWeek:+(document.getElementById('fatigueMaxWeek')?.value||60),maxFortnight:+(document.getElementById('fatigueMaxFortnight')?.value||120)};
  setJSON(FATIGUE_KEY,s);renderFatigueSettings();renderFatiguePanel();renderCalendar();renderEarnings();
}
function renderFatigueSettings(){
  const s=fatigueSettings();
  const d=document.getElementById('fatigueMaxDay'),w=document.getElementById('fatigueMaxWeek'),f=document.getElementById('fatigueMaxFortnight');
  if(d&&document.activeElement!==d)d.value=s.maxDay;if(w&&document.activeElement!==w)w.value=s.maxWeek;if(f&&document.activeElement!==f)f.value=s.maxFortnight;
  const box=document.getElementById('fatigueSettingsStatus');
  if(box){const fs=fatigueStatusForDate(selectedDate);box.className='fatigueSettingsStatus '+fs.cls;box.innerHTML=`${fs.icon} ${fs.title}<br><span style="font-size:12px;font-weight:800">${fs.message}</span>`;}
}
function addDaysISO(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)}
function fatigueDayHours(key,e){
  e=e||migrate(getEntries()[key],key);
  const flags=e.flags||{};
  const plainPaidPublicHoliday=!!flags.publicHoliday&&!flags.publicHolidayWorked;
  const baseHours=plainPaidPublicHoliday?0:(normalHoursForPay(e)?STD_HOURS:0);
  return baseHours+(calcDailyOT(e)||0);
}
function isFatigueWorkDay(key,e){
  e=e||migrate(getEntries()[key],key);
  const flags=e.flags||{};
  const plainPaidPublicHoliday=!!flags.publicHoliday&&!flags.publicHolidayWorked;
  const genuineWorkedType=!!(flags.working||flags.rdoWorked||flags.publicHolidayWorked);
  return !plainPaidPublicHoliday && (fatigueDayHours(key,e)>0 || (e.jobs||[]).length>0 || genuineWorkedType || !!flags.onCall);
}
function isFatigueRestDay(key,e){e=e||migrate(getEntries()[key],key);return !isFatigueWorkDay(key,e) && !(e.flags&&e.flags.onCall);}
function fatigueWindow(endKey,days){const arr=[];for(let i=days-1;i>=0;i--){const key=addDaysISO(endKey,-i);const e=migrate(getEntries()[key],key);arr.push({key,e,hours:fatigueDayHours(key,e),work:isFatigueWorkDay(key,e),rest:isFatigueRestDay(key,e),onCall:!!e.flags.onCall});}return arr;}
function fatigueStatusFromWindow(win){
  const s=fatigueSettings();
  const w13=win.slice(-13),w7=win.slice(-7),w14=win.slice(-14);
  const restDays=w13.filter(x=>x.rest).length;
  const hours13=w13.reduce((a,x)=>a+x.hours,0);
  const hours7=w7.reduce((a,x)=>a+x.hours,0);
  const hours14=w14.reduce((a,x)=>a+x.hours,0);
  const maxDay=Math.max(...w13.map(x=>x.hours),0);
  let cls='ok',title='Fatigue OK',icon='🟢',short='OK',message=`${restDays}/2 required 24hr breaks found in the rolling 13-day window.`;
  if(restDays<2 || maxDay>s.maxDay || hours7>s.maxWeek || hours14>s.maxFortnight){
    cls='breach';title='Break Required';icon='🔴';short='Break needed';
    const reasons=[];
    if(restDays<2)reasons.push(`only ${restDays}/2 rest days in 13 days`);
    if(maxDay>s.maxDay)reasons.push(`day limit exceeded (${maxDay.toFixed(1)}h > ${s.maxDay}h)`);
    if(hours7>s.maxWeek)reasons.push(`week limit exceeded (${hours7.toFixed(1)}h > ${s.maxWeek}h)`);
    if(hours14>s.maxFortnight)reasons.push(`fortnight limit exceeded (${hours14.toFixed(1)}h > ${s.maxFortnight}h)`);
    message=reasons.join(' · ');
  }else if(restDays===2){
    cls='warn';title='Fatigue Warning';icon='🟠';short='2/2 rest days';message=`At 2/2 required 24hr breaks in the rolling 13-day window.`;
  }
  return {cls,title,icon,short,message,restDays,hours13,hours7,hours14,maxDay};
}
function fatigueWindowWithPlannedWork(endKey,workKey,hours){
  return fatigueWindow(endKey,14).map(x=>{
    if(x.key!==workKey)return x;
    const plannedHours=Number(hours)||STD_HOURS;
    return {...x,hours:plannedHours,work:true,rest:false,onCall:false,planned:true};
  });
}
function fatigueStatusForPlannedWork(workKey,hours=STD_HOURS){return fatigueStatusFromWindow(fatigueWindowWithPlannedWork(workKey,workKey,hours));}
function nextAllowedWorkDay(fromKey,hours=STD_HOURS){
  for(let i=0;i<35;i++){
    const key=addDaysISO(fromKey,i);
    const fs=fatigueStatusForPlannedWork(key,hours);
    if(fs.cls!=='breach')return {date:key,status:fs,hours};
  }
  return null;
}
function fatigueStatusForDate(endKey){return fatigueStatusFromWindow(fatigueWindow(endKey,14));}
function potentialRestDaysForWeek(start){const out=[];for(let i=0;i<7;i++){const key=iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));const e=migrate(getEntries()[key],key);if(isFatigueRestDay(key,e))out.push(key);}return out;}
function suggestNextRestDay(fromKey){for(let i=0;i<14;i++){const key=addDaysISO(fromKey,i);const e=migrate(getEntries()[key],key);if(isFatigueRestDay(key,e))return {date:key};}return {date:addDaysISO(fromKey,1)};}
function fatigueDayType(x){if(x.rest)return 'Rest';if(x.onCall)return 'On-call';if(x.work)return 'Worked';return 'Available';}
function renderFatiguePanel(){
  const body=document.getElementById('fatiguePanelBody');
  if(!body)return;
  const fs=fatigueStatusForDate(selectedDate);
  const win=fatigueWindow(selectedDate,13);
  const suggested=suggestNextRestDay(selectedDate);
  const nextWork=nextAllowedWorkDay(selectedDate,STD_HOURS);
  const s=fatigueSettings();
  const rest=win.filter(x=>x.rest);
  const oncall=win.filter(x=>x.onCall);
  const worked=win.filter(x=>x.work);
  const potentialNext=[];
  for(let i=0;i<14;i++){
    const key=addDaysISO(selectedDate,i);
    const e=migrate(getEntries()[key],key);
    if(isFatigueRestDay(key,e))potentialNext.push(key);
    if(potentialNext.length>=5)break;
  }
  const days=win.map(x=>{
    let cls=x.rest?'good':(x.onCall?'work':(x.work?'bad':''));
    return `<div class="payMiniRow"><b>${niceDate(x.key)}</b><span><span class="bubble ${cls}">${fatigueDayType(x)}</span> ${x.hours?x.hours.toFixed(1)+'h':''}</span></div>`;
  }).join('');
  body.innerHTML=`
    <div class="fatigueBanner ${fs.cls}"><div style="font-size:18px">${fs.icon} ${fs.title}</div><div style="font-size:13px;font-weight:800;margin-top:6px">${fs.message}</div></div>
    <div class="payCentreGrid">
      <div class="payMetric ${fs.cls==='breach'?'warn':(fs.cls==='warn'?'warn':'good')}"><div class="k">24hr Breaks</div><span class="v">${fs.restDays}/2</span><div class="s">Rolling 13-day requirement</div></div>
      <div class="payMetric"><div class="k">13-Day Hours</div><span class="v">${fs.hours13.toFixed(1)}</span><div class="s">Max day ${fs.maxDay.toFixed(1)}h / limit ${s.maxDay}h</div></div>
      <div class="payMetric"><div class="k">Week / Limit</div><span class="v">${fs.hours7.toFixed(1)}h</span><div class="s">Limit ${s.maxWeek}h</div></div>
      <div class="payMetric"><div class="k">Fortnight / Limit</div><span class="v">${fs.hours14.toFixed(1)}h</span><div class="s">Limit ${s.maxFortnight}h</div></div>
    </div>
    <div class="card"><h3 class="settingsGroupTitle">Next Allowed Work Day</h3>${nextWork?`<div class="fatigueBanner ${nextWork.status.cls}"><div style="font-size:18px">${nextWork.status.cls==='ok'?'✅':'⚠️'} ${niceDate(nextWork.date)}</div><div style="font-size:13px;font-weight:800;margin-top:6px">Based on adding a standard ${nextWork.hours.toFixed(1)}h worked day. Result: ${nextWork.status.short} · ${nextWork.status.hours7.toFixed(1)}h week / ${nextWork.status.hours14.toFixed(1)}h fortnight.</div></div>`:'<div class="fatigueBanner breach">No allowed work day found in the next 35 days.</div>'}<p class="rateHint">This ignores paid-but-not-worked Public Holidays, RDO, Annual Leave and Sick Leave. Use the (Worked) types when you actually work them.</p></div>
    <div class="card"><h3 class="settingsGroupTitle">Next Break</h3><div class="fatigueRestList">${suggested?`<span class="fatigueChip warn">Next possible: ${niceDate(suggested.date)}</span>`:''}${potentialNext.length?potentialNext.map(d=>`<span class="fatigueChip rest">${niceDate(d)}</span>`).join(''):'<span class="fatigueChip breach">No clear rest days found</span>'}</div><p class="rateHint">On-call days are treated as non-rest days.</p></div>
    <div class="card"><h3 class="settingsGroupTitle">Rolling 13-Day Window</h3><div class="payMiniTable">${days}</div></div>
    <div class="card"><h3 class="settingsGroupTitle">Summary</h3><div class="bubbles"><span class="bubble good">Rest days: ${rest.length}</span><span class="bubble bad">Worked/on-call days: ${worked.length}</span><span class="bubble work">On-call days: ${oncall.length}</span></div></div>
  `;
}


function fatigueStatus(t){
  const end=new Date(t.start);end.setDate(end.getDate()+6);
  const fs=fatigueStatusForDate(iso(end));
  return {label:fs.cls==='breach'?'High':(fs.cls==='warn'?'Moderate':'OK'),cls:fs.cls==='breach'?'warn':(fs.cls==='warn'?'warn':'good'),note:fs.message,workedDays:0,longDays:fs.maxDay>=fatigueSettings().maxDay?1:0,totalHours:t.normal+t.ot};
}
function moneySigned(v){return (v>=0?'+':'-')+money(Math.abs(v))}
function renderPayCentre(e){
  const summary=document.getElementById('payCentreSummary');
  const details=document.getElementById('payCentreDetails');
  if(!summary||!details)return;
  const expected=expectedPayForPeriod(e.t);
  const diff=e.gross-expected.gross;
  const extra=e.overtime+allowanceTotal(e);
  const effective=extra>0&&e.t.ot>0?extra/e.t.ot:0;
  const ph=publicHolidayBreakdownForPeriod(e.t.start);
  const allowTotal=allowanceTotal(e);
  const ps=payslipCheck();
  const pg=parseFloat(ps.gross); const pn=parseFloat(ps.net);
  const grossDiff=Number.isFinite(pg)?pg-e.gross:null;
  const netDiff=Number.isFinite(pn)?pn-e.net:null;
  const rdoNormal=4*STD_HOURS*paySettings().base;
  const nonRdoNormal=5*STD_HOURS*paySettings().base;
  summary.innerHTML=[
    `<div class="payMetric dark"><div class="k">Expected vs Actual</div><span class="v">${moneySigned(diff)}</span><div class="s">Actual ${money(e.gross)} · Expected ${money(expected.gross)}</div></div>`,
    `<div class="payMetric"><div class="k">Estimated Take Home</div><span class="v">${money(e.net)}</span><div class="s">Tax estimate ${money(e.taxAmt)}</div></div>`,
    `<div class="payMetric"><div class="k">Extra Earned</div><span class="v">${money(extra)}</span><div class="s">OT + allowances above base</div></div>`
  ].join('');
  details.innerHTML=[
    `<div class="payMiniRow"><b>OT breakdown</b><span>${e.t.ot15.toFixed(1)}h @ 1.5× · ${e.t.ot2.toFixed(1)}h @ 2×</span></div>`,
    `<div class="payMiniRow"><b>Public holiday split</b><span>Base ${ph.baseHours.toFixed(1)}h / worked ${ph.workedHours.toFixed(1)}h penalty</span></div>`,
    `<div class="payMiniRow"><b>Allowances total</b><span>${money(allowTotal)} (${e.t.onCall} on-call · ${e.t.nightshift} night)</span></div>`,
    `<div class="payMiniRow"><b>RDO impact</b><span>Non-RDO base ${money(nonRdoNormal)} / RDO-week base ${money(rdoNormal)}</span></div>`,
    `<div class="payMiniRow"><b>Effective extra rate</b><span>${effective?money(effective)+'/hr':'—'}</span></div>`,
    `<div class="payMiniRow"><b>Tax method</b><span>Annualised resident brackets + 2% Medicare estimate</span></div>`,
    `<div class="payMiniRow"><b>Payslip gross check</b><span>${grossDiff===null?'Enter payslip gross':moneySigned(grossDiff)}</span></div>`,
    `<div class="payMiniRow"><b>Payslip net check</b><span>${netDiff===null?'Enter payslip net':moneySigned(netDiff)}</span></div>`
  ].join('');
  loadPayslipCheck();
}
function renderEarnings(){const e=calcPayDetailed();const end=new Date(e.t.start);end.setDate(end.getDate()+6);const range=document.getElementById('earnWeekRange');if(range)range.textContent=`${niceDate(iso(e.t.start))} - ${niceDate(iso(end))}`;const ids={earnWeekGross:e.gross,earnMonthGross:e.gross*4.333,earnYearGross:e.annualGross,earnNet:e.net};Object.entries(ids).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=money(v)});renderPayCentre(e);const grid=document.getElementById('earnBreakGrid');if(grid)grid.innerHTML=[['Normal base pay',e.normal],['OT 1.5× first 2h weekday/Sat',e.overtime15],['OT / Sunday / PH penalty 2×',e.overtime2],['On-call Weekday',e.onCall],['Nightshift',e.nightshift],['LAHA',e.laha],['Inconvenience',e.incon],['Higher Duties',e.higher],['General Allowance',e.allow],['PAYG tax estimate',-e.taxAmt]].map(([k,v])=>`<div class="earnLine"><b>${k}</b><span>${money(v)}</span></div>`).join('');const used=document.getElementById('earnHoursUsed');if(used)used.innerHTML=`<div class="earnLine"><b>Normal Hours</b><span>${e.t.normal.toFixed(1)}</span></div><div class="earnLine"><b>OT Hours</b><span>${e.t.ot.toFixed(1)} (${e.t.ot15.toFixed(1)} @1.5× / ${e.t.ot2.toFixed(1)} @2×)</span></div><div class="earnLine"><b>Jobs</b><span>${e.t.jobs}</span></div><div class="earnLine"><b>Tax Method</b><span>Annualised resident brackets + 2% Medicare</span></div><div class="earnLine"><b>Allowance Days</b><span>On-call ${e.t.onCall} · Night ${e.t.nightshift}</span></div>`}
function loadPayInputs(){const p=paySettings();[['rateBase','base'],['rateOT','ot'],['rateOnCall','onCall'],['rateNightshift','nightshift'],['rateHigher','higher'],['rateLAHA','laha'],['rateIncon','incon'],['rateAllowance','allow']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=p[k]||''})}
function savePay(){const p={base:+val('rateBase'),ot:+val('rateOT'),onCall:+val('rateOnCall'),onCallWeekend:+val('rateOnCallWeekend'),onCallPH:+val('rateOnCallPH'),nightshift:+val('rateNightshift'),higher:+val('rateHigher'),laha:+val('rateLAHA'),incon:+val('rateIncon'),allow:+val('rateAllowance')};setJSON(PAY_KEY,p);renderDashboard();renderEarnings()}
function val(id){return document.getElementById(id)?.value||''}
function noteCount(){return (getJSON(NOTES_KEY,[])||[]).length+' Notes'}
function saveNote(){const text=document.getElementById('noteText').value.trim();if(!text)return;const notes=getJSON(NOTES_KEY,[]);notes.unshift({date:todayISO(),selectedDate,text});setJSON(NOTES_KEY,notes);document.getElementById('noteText').value='';renderNotes();toast('Note saved')}
function saveQuickToHistory(){const q=document.getElementById('quickNote').value.trim();if(!q)return;const notes=getJSON(NOTES_KEY,[]);notes.unshift({date:todayISO(),selectedDate,text:q});setJSON(NOTES_KEY,notes);document.getElementById('quickNote').value='';localStorage.setItem(QUICK_KEY,'');renderNotes();toast('Quick note saved')}
function clearQuickNote(){document.getElementById('quickNote').value='';localStorage.setItem(QUICK_KEY,'');autoGrowQuickNote();toast('Quick note cleared')}
function autoGrowQuickNote(){
  const el=document.getElementById('quickNote');
  if(!el)return;
  el.style.height='auto';
  el.style.height=Math.max(140,el.scrollHeight+4)+'px';
}

const DRAW_KEY='field_diary_drawing_pad_v1';
let drawCtx=null,drawMode='pen',drawActive=false,drawLast=null,drawResizeTimer=null;
function initDrawPad(){
  const c=document.getElementById('drawCanvas');
  if(!c)return;
  const rect=c.getBoundingClientRect();
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const old=localStorage.getItem(DRAW_KEY);
  c.width=Math.max(320,Math.floor(rect.width*dpr));
  c.height=Math.max(320,Math.floor(rect.height*dpr));
  drawCtx=c.getContext('2d');
  drawCtx.setTransform(dpr,0,0,dpr,0,0);
  drawCtx.lineCap='round';
  drawCtx.lineJoin='round';
  drawCtx.fillStyle='#fff';
  drawCtx.fillRect(0,0,c.width/dpr,c.height/dpr);
  if(old){
    const img=new Image();
    img.onload=()=>drawCtx.drawImage(img,0,0,c.width/dpr,c.height/dpr);
    img.src=old;
  }
  if(c.dataset.drawBound==='1')return;
  c.dataset.drawBound='1';
  c.addEventListener('pointerdown',drawStart);
  c.addEventListener('pointermove',drawMove);
  c.addEventListener('pointerup',drawEnd);
  c.addEventListener('pointercancel',drawEnd);
}
function drawPoint(e){const c=document.getElementById('drawCanvas');const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function drawStart(e){e.preventDefault();initDrawPad();drawActive=true;drawLast=drawPoint(e);try{e.target.setPointerCapture(e.pointerId)}catch{} }
function drawMove(e){
  if(!drawActive||!drawCtx)return;
  e.preventDefault();
  const p=drawPoint(e);
  drawCtx.globalCompositeOperation=drawMode==='eraser'?'destination-out':'source-over';
  drawCtx.strokeStyle='#111';
  drawCtx.lineWidth=drawMode==='eraser'?18:4;
  drawCtx.beginPath();drawCtx.moveTo(drawLast.x,drawLast.y);drawCtx.lineTo(p.x,p.y);drawCtx.stroke();
  drawLast=p;
}
function drawEnd(){if(!drawActive)return;drawActive=false;saveDrawingLocal()}
function saveDrawingLocal(){const c=document.getElementById('drawCanvas');if(c)localStorage.setItem(DRAW_KEY,c.toDataURL('image/png'))}
function setDrawMode(mode){drawMode=mode;toast(mode==='eraser'?'Eraser on':'Pen on')}
function clearDrawingPad(){const c=document.getElementById('drawCanvas');if(!c)return;const r=c.getBoundingClientRect();drawCtx=c.getContext('2d');drawCtx.fillStyle='#fff';drawCtx.fillRect(0,0,r.width,r.height);localStorage.removeItem(DRAW_KEY);toast('Drawing cleared')}
function saveDrawingImage(){const c=document.getElementById('drawCanvas');if(!c)return;saveDrawingLocal();const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='field-drawing-'+todayISO()+'.png';a.click();toast('Drawing downloaded')}
function saveDrawingToNotes(){saveDrawingLocal();toast('Drawing saved locally')}
window.addEventListener('resize',()=>{clearTimeout(drawResizeTimer);drawResizeTimer=setTimeout(()=>{if(document.getElementById('drawPanel')?.classList.contains('open'))initDrawPad()},250)});

function renderNotes(){const notes=getJSON(NOTES_KEY,[]);document.getElementById('notesHistory').innerHTML=(notes||[]).map(n=>`<div class="noteItem"><div class="noteDate">Saved ${niceDate(n.date)} · For ${niceDate(n.selectedDate||n.date)}</div><div class="desc">${esc(n.text)}</div></div>`).join('')||'<div class="card">No notes yet.</div>';renderSettingsNotes();}
function currentBackupKeys(){return APP_BACKUP_KEYS.filter(Boolean)}
function buildFullBackup(includeGitHubSettings=false){
  const data={
    schema:'field-diary-full-backup-v3',
    updated:new Date().toISOString(),
    keys:{}
  };
  currentBackupKeys().forEach(k=>{
    if(k===GH_KEY&&!includeGitHubSettings)return;
    const v=localStorage.getItem(k);
    if(v!==null)data.keys[k]=v;
  });
  // Human-readable mirrors for older restore files and easy inspection.
  data.entries=getEntries();
  data.notes=getJSON(NOTES_KEY,[]);
  data.pay=paySettings();
  data.crewList=CREW_NAMES;
  data.vehicleList=VEHICLE_NAMES;
  data.crewGroups=CREW_GROUPS;
  data.vehicleGroups=VEHICLE_GROUPS;
  data.substations=SUBSTATIONS;
  data.circuits=CIRCUITS;
  data.accommodation=ACCOMMODATION;
  data.swops=SWOPS;
  data.rdo=RDO_SETTINGS;
  data.fatigue=getJSON(FATIGUE_KEY,{});
  return data;
}
function applyFullBackup(data){
  if(!data||typeof data!=='object')throw new Error('Invalid backup file');
  if(data.keys&&typeof data.keys==='object'){
    Object.entries(data.keys).forEach(([k,v])=>{
      if(typeof k==='string'&&v!==undefined&&v!==null){
        const targetKey=OLD_STORAGE_KEYS.includes(k)?STORAGE_KEY:k;
        localStorage.setItem(targetKey,String(v));
      }
    });
    OLD_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));
  }else{
    if(data.entries)setEntries(data.entries);
    if(data.notes)setJSON(NOTES_KEY,data.notes);
    if(data.pay)setJSON(PAY_KEY,data.pay);
    if(data.crewGroups)setJSON(CREW_GROUPS_KEY,data.crewGroups);
    if(data.vehicleGroups)setJSON(VEHICLE_GROUPS_KEY,data.vehicleGroups);
    if(data.crewList)setJSON(CREW_LIST_KEY,data.crewList);
    if(data.vehicleList)setJSON(VEHICLE_LIST_KEY,data.vehicleList);
    if(data.substations)setJSON(SUBSTATION_LIST_KEY,data.substations);
    if(data.circuits)setJSON(CIRCUIT_LIST_KEY,data.circuits);
    if(data.accommodation)setJSON(ACCOMMODATION_LIST_KEY,data.accommodation);
    if(data.swops)setJSON(SWOP_LIST_KEY,data.swops);
    if(data.rdo)setJSON(RDO_KEY,data.rdo);
    if(data.fatigue)setJSON(FATIGUE_KEY,data.fatigue);
  }
  loadRDOSettings();
  loadCrewVehicleLists();
  selectedDate=isFuture(selectedDate)?todayISO():selectedDate;
  entry=applyAutoLock(migrate(getEntries()[selectedDate],selectedDate));
  writeEntryToForm();
  renderAll(false);
}
function exportBackup(){
  const blob=new Blob([JSON.stringify(buildFullBackup(true),null,2)],{type:'application/json'});
  downloadBlob(blob,'field-diary-full-backup.json');
}
function backupPreviewText(data){
  const keyCount=data?.keys&&typeof data.keys==='object'?Object.keys(data.keys).length:0;
  const entryCount=data?.keys?.[STORAGE_KEY]?Object.keys(JSON.parse(data.keys[STORAGE_KEY]||'{}')).length:(data?.entries?Object.keys(data.entries).length:0);
  const updated=data?.updated||data?.created||'Unknown';
  return `Restore preview:

Updated: ${updated}
Entries: ${entryCount}
Keys/settings: ${keyCount||'legacy backup'}

This will overwrite the diary data and settings on this device.`;
}
function restoreBackup(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      if(!confirm(backupPreviewText(data)))return;
      applyFullBackup(data);
      toast('Full backup restored');
    }catch(e){
      console.warn(e);
      alert('Restore failed');
    }finally{
      const input=document.getElementById('restoreFile');
      if(input)input.value='';
    }
  };
  r.readAsText(file);
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function loadGitHubSettings(){const g=getJSON(GH_KEY,{});['githubToken','githubOwner','githubRepo','githubBranch','githubPath'].forEach(id=>{document.getElementById(id).value=g[id]||''});renderBackupStatus()}
function saveGitHubSettings(){const g={};['githubToken','githubOwner','githubRepo','githubBranch','githubPath'].forEach(id=>g[id]=document.getElementById(id).value.trim());setJSON(GH_KEY,g);toast('GitHub settings saved');renderBackupStatus()}
function backupAgeInfo(){
  const iso=localStorage.getItem(GH_LAST_ISO_KEY);
  if(!iso)return {ok:false,stale:true,label:'No successful GitHub backup yet',ageMs:Infinity};
  const ageMs=Date.now()-new Date(iso).getTime();
  const mins=Math.max(0,Math.floor(ageMs/60000));
  const hours=Math.floor(mins/60);
  const label=hours>=1?`${hours}h ${mins%60}m ago`:`${mins}m ago`;
  return {ok:ageMs<=24*60*60*1000,stale:ageMs>24*60*60*1000,label,ageMs};
}
function renderBackupHealthStrip(){
  const el=document.getElementById('backupHealthStrip');
  if(!el)return;
  const g=getJSON(GH_KEY,{});
  const configured=!!(g.githubToken&&g.githubOwner&&g.githubRepo);
  const age=backupAgeInfo();
  const cls=!configured?'neutral':(age.ok?'ok':'bad');
  el.className='backupHealthStrip topBackupStatus '+cls;
  el.innerHTML=!configured?'GitHub not set':(age.ok?`GitHub ${esc(age.label)}`:`⚠ GitHub old ${esc(age.label)}`);
}

function renderBuildInfo(){
  const el=document.getElementById('buildInfoStatus');
  if(el)el.innerHTML=`Build: <b>${esc(APP_VERSION)}</b><br>Storage: <b>${esc(STORAGE_KEY)}</b><br>Backup: full localStorage snapshot, excluding GitHub token.`;
}
function renderBackupStatus(){
  const el=document.getElementById('githubStatus');
  const g=getJSON(GH_KEY,{});
  const keyCount=Object.keys(buildFullBackup(false).keys||{}).length;
  const age=backupAgeInfo();
  if(el){
    el.className='backupStatus '+(g.githubToken&&g.githubOwner&&g.githubRepo?(age.ok?'backupOk':'backupBad'):'');
    el.textContent=g.githubToken&&g.githubOwner&&g.githubRepo?`GitHub full backup ready · ${keyCount} keys · last successful: ${age.label}`:`GitHub not set. Full backup will include entries + settings when configured.`;
  }
  const l=document.getElementById('localBackupStatus');
  if(l){
    l.textContent=`Local entries: ${Object.keys(getEntries()).length}. Full backup keys ready: ${keyCount}.`;
  }
  renderBackupHealthStrip();
  renderBuildInfo();
}
function syncNow(){saveLocal();syncGitHubBackupNow(true)}
function debouncedAutoSync(){clearTimeout(window.__autosync);window.__autosync=setTimeout(()=>syncGitHubBackupNow(false),800)}
async function syncGitHubBackupNow(manual=false){
  const g=getJSON(GH_KEY,{});
  if(!g.githubToken||!g.githubOwner||!g.githubRepo||ghSyncing){if(manual)toast('GitHub settings missing');return}
  ghSyncing=true;
  try{
    const path=g.githubPath||'field-diary-full-backup.json',branch=g.githubBranch||'main';
    const url=`https://api.github.com/repos/${encodeURIComponent(g.githubOwner)}/${encodeURIComponent(g.githubRepo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    let sha=null;
    try{
      const res=await fetch(url+`?ref=${encodeURIComponent(branch)}`,{headers:{Authorization:`Bearer ${g.githubToken}`,Accept:'application/vnd.github+json'}});
      if(res.ok){const existing=await res.json();sha=existing.sha}
    }catch(e){}
    const backup=buildFullBackup(false); // Do not upload GitHub token/settings to GitHub.
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(backup,null,2))));
    const put=await fetch(url,{method:'PUT',headers:{Authorization:`Bearer ${g.githubToken}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message:'Field Diary full backup',content,branch,sha})});
    if(!put.ok)throw new Error(await put.text());
    localStorage.setItem('ghLast',new Date().toLocaleString());
    localStorage.setItem(GH_LAST_ISO_KEY,new Date().toISOString());
    if(manual)toast('Full GitHub backup synced');
  }catch(e){
    console.warn(e);
    if(manual)toast('GitHub sync failed');
  }finally{ghSyncing=false;renderBackupStatus()}
}

function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function changeSelectedDayBySwipe(delta){
  const next=new Date(selectedDate+'T12:00:00');
  next.setDate(next.getDate()+delta);
  const key=iso(next);
  if(isFuture(key)){toast('Future days locked');haptic('light');return;}
  selectDate(key);
  toast((delta>0?'Next day: ':'Previous day: ')+niceDate(key));
  haptic('light');
}
function bindSwipe(){/* retired: one global controller handles dashboard/calendar/weekly swipes */}
function setupSwipes(){
  if(window.__fieldDiarySwipeInstalled)return;
  window.__fieldDiarySwipeInstalled=true;
  let sx=0, sy=0, startTarget=null, startPanel='', active=false, startTime=0;
  const blockedSelector='input,textarea,select,[contenteditable="true"],.dragHandle,#drawCanvas';
  function openPanelId(){const p=document.querySelector('.panel.open');return p?p.id:'';}
  function validTarget(t){return t && !t.closest(blockedSelector);}
  window.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' && e.button!==0)return;
    if(!validTarget(e.target))return;
    startTarget=e.target;
    startPanel=openPanelId();
    // Only allow global swipes on dashboard, calendar, weekly, or the bottom nav area.
    if(startPanel && startPanel!=='calendarPanel' && startPanel!=='weeklyPanel')return;
    sx=e.clientX||0; sy=e.clientY||0; startTime=Date.now(); active=true;
  },{passive:true,capture:true});
  window.addEventListener('pointerup',e=>{
    if(!active)return; active=false;
    const dx=(e.clientX||0)-sx, dy=(e.clientY||0)-sy;
    if(Date.now()-startTime>900)return;
    if(Math.abs(dx)<42 || Math.abs(dx)<Math.abs(dy)*1.2)return;
    if(swipeBusy)return;
    swipeBusy=true;
    setTimeout(()=>{swipeBusy=false},260);
    const panel=startPanel || openPanelId();
    if(panel==='calendarPanel'){
      changeMonth(dx<0?1:-1);
      haptic('light');
      return;
    }
    if(panel==='weeklyPanel'){
      changeWeek(dx<0?1:-1);
      toast(dx<0?'Next week':'Previous week');
      haptic('light');
      return;
    }
    if(!openPanelId()){
      changeSelectedDayBySwipe(dx<0?1:-1);
    }
  },{passive:true,capture:true});
  window.addEventListener('pointercancel',()=>{active=false},{passive:true,capture:true});
}



function uniqueCleanList(arr,defaults=[]){
  const seen=new Set();
  return [...(Array.isArray(arr)?arr:[]),...(Array.isArray(defaults)?defaults:[])].map(x=>String(x||'').trim()).filter(Boolean).filter(x=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
}
function cleanGroupObject(obj,defaults){
  const out={};
  if(obj&&typeof obj==='object')Object.keys(obj).forEach(k=>{
    const cleanKey=String(k||'').trim();
    if(!cleanKey)return;
    out[cleanKey]=uniqueCleanList(obj[k]||[],[]);
  });
  Object.keys(defaults||{}).forEach(k=>{if(!out[k])out[k]=[]});
  return out;
}
function migrateRemovedCrewOne(groups){
  if(groups&&groups['Crew 1']){
    groups['Team 1']=uniqueCleanList([...(groups['Team 1']||[]),...(groups['Crew 1']||[])],[]);
    delete groups['Crew 1'];
  }
  return groups;
}
function flattenGroups(groups){return Object.values(groups||{}).flat().filter(Boolean)}
function seedGroupIfEmpty(groups,groupName,oldList){
  const total=flattenGroups(groups).length;
  if(total===0 && Array.isArray(oldList) && oldList.length){groups[groupName]=uniqueCleanList(oldList,[])}
  return groups;
}
function loadCrewVehicleLists(){
  const oldCrew=getJSON(CREW_LIST_KEY,[]);
  const oldVehicles=getJSON(VEHICLE_LIST_KEY,[]);
  CREW_GROUPS=migrateRemovedCrewOne(cleanGroupObject(getJSON(CREW_GROUPS_KEY,null),DEFAULT_CREW_GROUPS));
  VEHICLE_GROUPS=cleanGroupObject(getJSON(VEHICLE_GROUPS_KEY,null),DEFAULT_VEHICLE_GROUPS);
  CREW_GROUPS=seedGroupIfEmpty(CREW_GROUPS,'Team 1',uniqueCleanList(oldCrew,DEFAULT_CREW_NAMES));
  VEHICLE_GROUPS=seedGroupIfEmpty(VEHICLE_GROUPS,'Light Vehicle',uniqueCleanList(oldVehicles,DEFAULT_VEHICLE_NAMES));
  CREW_NAMES=uniqueCleanList(flattenGroups(CREW_GROUPS),[]);
  VEHICLE_NAMES=uniqueCleanList(flattenGroups(VEHICLE_GROUPS),[]);
  SUBSTATIONS=uniqueCleanList(getJSON(SUBSTATION_LIST_KEY,[]),DEFAULT_SUBSTATIONS);
  CIRCUITS=uniqueCleanList(getJSON(CIRCUIT_LIST_KEY,[]),DEFAULT_CIRCUITS);
  ACCOMMODATION=uniqueCleanList(getJSON(ACCOMMODATION_LIST_KEY,[]),DEFAULT_ACCOMMODATION);
  SWOPS=uniqueCleanList(getJSON(SWOP_LIST_KEY,[]),DEFAULT_SWOPS);
  saveManagedLists();
}
function saveManagedLists(){
  CREW_GROUPS=migrateRemovedCrewOne(cleanGroupObject(CREW_GROUPS,DEFAULT_CREW_GROUPS));
  VEHICLE_GROUPS=cleanGroupObject(VEHICLE_GROUPS,DEFAULT_VEHICLE_GROUPS);
  CREW_NAMES=uniqueCleanList(flattenGroups(CREW_GROUPS),[]);
  VEHICLE_NAMES=uniqueCleanList(flattenGroups(VEHICLE_GROUPS),[]);
  SUBSTATIONS=uniqueCleanList(SUBSTATIONS,[]);
  CIRCUITS=uniqueCleanList(CIRCUITS,[]);
  setJSON(CREW_GROUPS_KEY,CREW_GROUPS);
  setJSON(VEHICLE_GROUPS_KEY,VEHICLE_GROUPS);
  setJSON(CREW_LIST_KEY,CREW_NAMES);
  setJSON(VEHICLE_LIST_KEY,VEHICLE_NAMES);
  setJSON(SUBSTATION_LIST_KEY,SUBSTATIONS);
  setJSON(CIRCUIT_LIST_KEY,CIRCUITS);
  setJSON(ACCOMMODATION_LIST_KEY,ACCOMMODATION);
  setJSON(SWOP_LIST_KEY,SWOPS);
}
function saveCrewVehicleLists(){saveManagedLists();}
function renderSettingsManagers(){const swopBox=document.getElementById('settingsSWOPList');if(swopBox){swopBox.innerHTML=SWOPS.length?SWOPS.map(x=>`<div class="managerItem"><div class="managerItemText">${esc(x)}</div><button class="managerDelete" onclick="deleteSWOPSetting('${enc(x)}')">Delete</button></div>`).join(''):'<div class="settingsEmpty">No SWOPs saved</div>';}
  renderSettingsNotes();
  renderSettingsVehicles();
  renderSettingsCrew();
  renderSettingsSubstations();
  renderSettingsCircuits();
  renderRDOSettings();
  renderFatigueSettings();
const accBox=document.getElementById('settingsAccommodationList');if(accBox){accBox.innerHTML=ACCOMMODATION.length?ACCOMMODATION.map(x=>`<div class="managerItem"><div class="managerItemText">${esc(x)}</div><button class="managerDelete" onclick="deleteAccommodationSetting('${enc(x)}')">Delete</button></div>`).join(''):'<div class="settingsEmpty">No accommodation saved</div>';}}
function pageMaxFor(list){return Math.max(0,Math.ceil((list||[]).length/SETTINGS_PAGE_SIZE)-1)}
function clampManagerPage(kind,list){settingsPages[kind]=Math.max(0,Math.min(pageMaxFor(list),settingsPages[kind]||0));}
function managerPager(kind,list){
  const total=(list||[]).length;
  const max=pageMaxFor(list);
  const page=(settingsPages[kind]||0);
  if(total<=SETTINGS_PAGE_SIZE)return `<div class="managerCount">${total} item${total===1?'':'s'}</div>`;
  return `<div class="managerPager"><button ${page<=0?'disabled':''} onclick="changeManagerPage('${kind}',-1)">Previous</button><div class="managerPageLabel">Page ${page+1} / ${max+1}</div><button ${page>=max?'disabled':''} onclick="changeManagerPage('${kind}',1)">Next</button></div><div class="managerCount">${total} items</div>`;
}
function getPagedListByKey(kind){
  if(kind==='substations')return SUBSTATIONS;
  if(kind==='circuits')return CIRCUITS;
  const vehPrefix='vehGroup_';
  const crewPrefix='crewGroup_';
  if(kind.startsWith(vehPrefix)){const match=Object.keys(VEHICLE_GROUPS).find(g=>groupPageKey('vehGroup',g)===kind);return match?VEHICLE_GROUPS[match]:[];}
  if(kind.startsWith(crewPrefix)){const match=Object.keys(CREW_GROUPS).find(g=>groupPageKey('crewGroup',g)===kind);return match?CREW_GROUPS[match]:[];}
  return [];
}
function changeManagerPage(kind,dir){
  const list=getPagedListByKey(kind);
  settingsPages[kind]=Math.max(0,Math.min(pageMaxFor(list),(settingsPages[kind]||0)+dir));
  renderSettingsManagers();
  haptic('light');
}
function renderManagerList(boxId,kind,list,removeFnName,emptyText){
  const box=document.getElementById(boxId);if(!box)return;
  clampManagerPage(kind,list);
  const page=settingsPages[kind]||0;
  const visible=(list||[]).slice(page*SETTINGS_PAGE_SIZE,page*SETTINGS_PAGE_SIZE+SETTINGS_PAGE_SIZE);
  box.innerHTML=(visible.length?visible.map(v=>`<div class="managerItem"><div class="managerItemText">${esc(v)}</div><button class="managerDelete" onclick="${removeFnName}('${enc(v)}')">Remove</button></div>`).join(''):`<div class="settingsEmpty">${emptyText}</div>`)+managerPager(kind,list||[]);
}
function renderSettingsNotes(){
  const box=document.getElementById('settingsNotesList');
  if(!box)return;
  const notes=getJSON(NOTES_KEY,[])||[];
  box.innerHTML=notes.length?notes.map((n,i)=>`<div class="managerItem"><div class="managerItemText">${esc((n.text||'').slice(0,90))||'Note'}<span class="managerItemSub">Saved ${esc(niceDate(n.date||todayISO()))} · For ${esc(niceDate(n.selectedDate||n.date||todayISO()))}</span></div><button class="managerDelete" onclick="deleteSettingsNote(${i})">Delete</button></div>`).join(''):'<div class="settingsEmpty">No saved notes.</div>';
}
function deleteSettingsNote(i){
  const notes=getJSON(NOTES_KEY,[])||[];
  if(i<0||i>=notes.length)return;
  if(!confirm('Delete this note?'))return;
  notes.splice(i,1);
  setJSON(NOTES_KEY,notes);
  renderNotes();
  renderSettingsNotes();
  toast('Note deleted');
}
function groupPageKey(prefix,group){return prefix+'_'+group.replace(/\W+/g,'_').toLowerCase()}
function renderGroupedSettings(boxId,groups,kindPrefix,addFn,removeFn,placeholder,removeGroupFn){
  const box=document.getElementById(boxId);if(!box)return;
  const groupNames=Object.keys(groups);
  box.innerHTML=groupNames.length?groupNames.map(group=>{
    const list=groups[group]||[];
    const key=groupPageKey(kindPrefix,group);
    clampManagerPage(key,list);
    const page=settingsPages[key]||0;
    const visible=list.slice(page*SETTINGS_PAGE_SIZE,page*SETTINGS_PAGE_SIZE+SETTINGS_PAGE_SIZE);
    const items=visible.length?visible.map(v=>`<div class="managerItem" data-drag-scope="${kindPrefix}Item" data-group="${enc(group)}" data-value="${enc(v)}"><button class="dragHandle" type="button" data-drag-handle onclick="event.stopPropagation()">☰</button><div class="managerItemText">${esc(v)}</div><button class="managerDelete" onclick="${removeFn}('${enc(group)}','${enc(v)}')">Remove</button></div>`).join(''):`<div class="settingsEmpty">No items in ${esc(group)}.</div>`;
    const body=`<div class="managerList">${items}</div>${managerPager(key,list)}<div class="settingsAddRow"><input id="${kindPrefix}_${enc(group)}" placeholder="${esc(placeholder)}"><button class="primary" onclick="${addFn}('${enc(group)}')">Add</button></div>`;
    const actions=`<button class="dragHandle" type="button" data-drag-handle onclick="event.stopPropagation()">☰</button><button class="managerDelete" onclick="${removeGroupFn}('${enc(group)}')">Remove Group</button>`;
    return groupBoxHTML(kindPrefix,group,`${list.length} item${list.length===1?'':'s'}`,body,actions);
  }).join(''):'<div class="settingsEmpty">No groups saved. Add a group below.</div>';
}
function renderSettingsVehicles(){renderGroupedSettings('settingsVehiclesList',VEHICLE_GROUPS,'vehGroup','addVehicleToGroup','removeVehicleFromGroup','Add registration','removeVehicleGroupSetting');}
function addVehicleGroupSetting(){
  const input=document.getElementById('newVehicleGroupSetting');
  const g=(input?.value||'').trim();if(!g)return;
  if(!VEHICLE_GROUPS[g])VEHICLE_GROUPS[g]=[];
  if(input)input.value='';saveManagedLists();renderSettingsVehicles();renderCrewVehicles();toast('Vehicle group added');
}
function removeVehicleGroupSetting(g){
  const group=dec(g);
  if(!confirm('Remove this vehicle group and its registration quick picks? Existing diary entries stay saved.'))return;
  delete VEHICLE_GROUPS[group];saveManagedLists();renderSettingsVehicles();renderCrewVehicles();toast('Vehicle group removed');
}
function addVehicleToGroup(g){
  const group=dec(g);const input=document.getElementById('vehGroup_'+enc(group));const v=(input?.value||'').trim();if(!v)return;
  VEHICLE_GROUPS[group]=VEHICLE_GROUPS[group]||[];
  if(!VEHICLE_GROUPS[group].some(x=>x.toLowerCase()===v.toLowerCase()))VEHICLE_GROUPS[group].push(v);
  if(input)input.value='';saveManagedLists();renderSettingsVehicles();renderCrewVehicles();toast('Vehicle added');
}
function removeVehicleFromGroup(g,v){
  const group=dec(g),val=dec(v);if(!confirm('Remove vehicle registration? Existing entries stay saved.'))return;
  VEHICLE_GROUPS[group]=(VEHICLE_GROUPS[group]||[]).filter(x=>x!==val);saveManagedLists();renderSettingsVehicles();renderCrewVehicles();toast('Vehicle removed');
}
function addVehicleSetting(){addVehicleToGroup(enc('Light Vehicle'))}
function removeVehicleSetting(v){removeVehicleFromGroup(enc('Light Vehicle'),v)}
function renderSettingsCrew(){renderGroupedSettings('settingsCrewList',CREW_GROUPS,'crewGroup','addCrewToGroup','removeCrewFromGroup','Add name','removeCrewGroupSetting');}
function addCrewGroupSetting(){
  const input=document.getElementById('newCrewGroupSetting');
  const g=(input?.value||'').trim();if(!g)return;
  if(g.toLowerCase()==='crew 1'){toast('Crew 1 removed — use Team 1 or another name');return;}
  if(!CREW_GROUPS[g])CREW_GROUPS[g]=[];
  if(input)input.value='';saveManagedLists();renderSettingsCrew();renderCrewVehicles();toast('Crew group added');
}
function removeCrewGroupSetting(g){
  const group=dec(g);
  if(!confirm('Remove this crew group and its member quick picks? Existing diary entries stay saved.'))return;
  delete CREW_GROUPS[group];saveManagedLists();renderSettingsCrew();renderCrewVehicles();toast('Crew group removed');
}
function addCrewToGroup(g){
  const group=dec(g);const input=document.getElementById('crewGroup_'+enc(group));const c=(input?.value||'').trim();if(!c)return;
  CREW_GROUPS[group]=CREW_GROUPS[group]||[];
  if(!CREW_GROUPS[group].some(x=>x.toLowerCase()===c.toLowerCase()))CREW_GROUPS[group].push(c);
  if(input)input.value='';saveManagedLists();renderSettingsCrew();renderCrewVehicles();toast('Crew member added');
}
function removeCrewFromGroup(g,c){
  const group=dec(g),val=dec(c);if(!confirm('Remove crew member? Existing entries stay saved.'))return;
  CREW_GROUPS[group]=(CREW_GROUPS[group]||[]).filter(x=>x!==val);saveManagedLists();renderSettingsCrew();renderCrewVehicles();toast('Crew removed');
}
function addCrewSetting(){addCrewToGroup(enc('Team 1'))}
function removeCrewSetting(c){removeCrewFromGroup(enc('Team 1'),c)}
function renderSettingsSubstations(){renderManagerList('settingsSubstationsList','substations',SUBSTATIONS,'removeSubstationSetting','No substations saved.');}


function saveSWOPList(){setJSON(SWOP_LIST_KEY,SWOPS);renderSettingsManagers();debouncedAutoSync();}
function addSWOPSetting(){const el=document.getElementById('newSWOPSetting');const v=(el?.value||'').trim();if(!v)return;if(!SWOPS.includes(v))SWOPS.push(v);if(el)el.value='';saveSWOPList();toast('SWOP added');}
function deleteSWOPSetting(v){v=dec(v);SWOPS=SWOPS.filter(x=>x!==v);entry.jobs.forEach(j=>{if(Array.isArray(j.switchingRows)){j.switchingRows.forEach(r=>{if(r.swop===v)r.swop='';});}});saveLocal();saveSWOPList();toast('SWOP removed');}

function saveAccommodationList(){setJSON(ACCOMMODATION_LIST_KEY,ACCOMMODATION);renderSettingsManagers();renderAccommodationSelect();debouncedAutoSync();}
function addAccommodationSetting(){const el=document.getElementById('newAccommodationSetting');const v=(el?.value||'').trim();if(!v)return;if(!ACCOMMODATION.includes(v))ACCOMMODATION.push(v);if(el)el.value='';saveAccommodationList();toast('Accommodation added');}
function deleteAccommodationSetting(v){v=dec(v);ACCOMMODATION=ACCOMMODATION.filter(x=>x!==v);if(entry.accommodation===v){entry.accommodation='';saveLocal();}saveAccommodationList();toast('Accommodation removed');}

function addSubstationSetting(){
  const input=document.getElementById('newSubstationSetting');
  const v=(input?.value||'').trim();if(!v)return;
  if(!SUBSTATIONS.some(x=>x.toLowerCase()===v.toLowerCase()))SUBSTATIONS.push(v);
  if(input)input.value='';
  saveManagedLists();settingsPages.substations=pageMaxFor(SUBSTATIONS);
  renderSettingsSubstations();toast('Substation added');
}
function removeSubstationSetting(v){
  v=dec(v);if(!confirm('Remove substation from settings?'))return;
  SUBSTATIONS=SUBSTATIONS.filter(x=>x!==v);
  saveManagedLists();renderSettingsSubstations();toast('Substation removed');
}
function renderSettingsCircuits(){renderManagerList('settingsCircuitsList','circuits',CIRCUITS,'removeCircuitSetting','No transmission circuits saved.');}
function addCircuitSetting(){
  const input=document.getElementById('newCircuitSetting');
  const v=(input?.value||'').trim();if(!v)return;
  if(!CIRCUITS.some(x=>x.toLowerCase()===v.toLowerCase()))CIRCUITS.push(v);
  if(input)input.value='';
  saveManagedLists();settingsPages.circuits=pageMaxFor(CIRCUITS);
  renderSettingsCircuits();toast('Transmission circuit added');
}
function removeCircuitSetting(v){
  v=dec(v);if(!confirm('Remove transmission circuit from settings?'))return;
  CIRCUITS=CIRCUITS.filter(x=>x!==v);
  saveManagedLists();renderSettingsCircuits();toast('Transmission circuit removed');
}


function renderRDOSettings(){
  const base=document.getElementById('rdoBaseDate');
  if(base)base.value=RDO_SETTINGS.baseDate||'';
  const status=document.getElementById('rdoCycleStatus');
  if(status){
    if(RDO_SETTINGS.baseDate){
      const selected=isRosterRDODate(selectedDate)?' Selected date is an RDO.':'';
      status.textContent='Repeats every 14 days from '+niceDate(RDO_SETTINGS.baseDate)+'.'+selected;
    }else status.textContent='No Rostered Day Off cycle set yet.';
  }
  const list=document.getElementById('rdoMovesList');
  if(list){
    const moves=RDO_SETTINGS.moves||[];
    list.innerHTML=moves.length?moves.map((m,i)=>`<div class="managerItem"><div class="managerItemText">${esc(m.name||'Holiday move')}<span class="managerItemSub">${esc(niceDate(m.holiday))} → RDO ${esc(niceDate(m.rdo))}</span></div><button class="managerDelete" onclick="deleteRDOHolidayMove(${i})">Delete</button></div>`).join(''):'<div class="settingsEmpty">No Rostered Day Off moves saved</div>';
  }
}
function saveRDOSettingsFromForm(){
  const base=document.getElementById('rdoBaseDate')?.value||'';
  RDO_SETTINGS.baseDate=base;
  saveRDOSettings();
  toast('Rostered Day Off roster saved');
}
function flipRDOMonday(){
  if(!RDO_SETTINGS.baseDate){toast('Set base RDO Monday first');return;}
  const d=new Date(RDO_SETTINGS.baseDate+'T12:00:00');
  d.setDate(d.getDate()+7);
  RDO_SETTINGS.baseDate=iso(d);
  saveRDOSettings();
  toast('Rostered Day Off swapped to opposite Monday');
}
function applyRosterRDOToSelectedDate(){
  RDO_SETTINGS.baseDate=selectedDate;
  entry.flags.rdo=true;entry.flags.working=false;entry.flags.normalHours=false;entry.manualUnlock=false;entry.locked=false;
  saveLocal();saveRDOSettings();
  toast('Selected date set as Rostered Day Off cycle');
}
function addRDOHolidayMove(){
  const h=document.getElementById('rdoHolidayDate')?.value||'';
  const r=document.getElementById('rdoMovedDate')?.value||'';
  const n=(document.getElementById('rdoHolidayName')?.value||'').trim();
  if(!h||!r){toast('Add holiday date and moved RDO date');return;}
  RDO_SETTINGS.moves=(RDO_SETTINGS.moves||[]).filter(x=>x.holiday!==h&&x.rdo!==r);
  RDO_SETTINGS.moves.push({holiday:h,rdo:r,name:n});
  ['rdoHolidayDate','rdoMovedDate','rdoHolidayName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  saveRDOSettings();
  toast('Rostered Day Off move saved');
}
function deleteRDOHolidayMove(i){
  RDO_SETTINGS.moves=(RDO_SETTINGS.moves||[]).filter((_,idx)=>idx!==i);
  saveRDOSettings();
  toast('Rostered Day Off move removed');
}

function installSettingsDragHandles(){
  if(window.__settingsDragInstalled)return;
  window.__settingsDragInstalled=true;
  let drag=null;
  document.addEventListener('pointerdown',e=>{
    const handle=e.target.closest('[data-drag-handle]');
    if(!handle||!handle.closest('#settingsPanel'))return;
    const row=handle.closest('.managerItem')||handle.closest('.groupBox');
    if(!row)return;
    e.preventDefault();
    e.stopPropagation();
    const isGroup=row.classList.contains('groupBox');
    const container=isGroup?row.parentElement:row.parentElement;
    drag={row,container,isGroup,startY:e.clientY,moved:false};
    row.classList.add('dragMoving');
    document.body.classList.add('dragActive');
    try{handle.setPointerCapture(e.pointerId)}catch{}
    haptic('light');
  },{passive:false});
  document.addEventListener('pointermove',e=>{
    if(!drag)return;
    e.preventDefault();
    drag.moved=true;
    const selector=drag.isGroup?'.groupBox':'.managerItem';
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(selector);
    if(!target||target===drag.row||target.parentElement!==drag.container)return;
    const box=target.getBoundingClientRect();
    const before=e.clientY<box.top+box.height/2;
    drag.container.insertBefore(drag.row,before?target:target.nextSibling);
  },{passive:false});
  function finishDrag(e){
    if(!drag)return;
    e&&e.preventDefault&&e.preventDefault();
    const d=drag;
    d.row.classList.remove('dragMoving');
    document.body.classList.remove('dragActive');
    drag=null;
    saveDraggedOrder(d);
    haptic('medium');
  }
  document.addEventListener('pointerup',finishDrag,{passive:false});
  document.addEventListener('pointercancel',finishDrag,{passive:false});
}
function saveDraggedOrder(d){
  if(!d)return;
  if(d.isGroup){
    const rows=[...d.container.querySelectorAll(':scope > .groupBox')];
    const order=rows.map(r=>dec(r.dataset.group||'')).filter(Boolean);
    if(d.container.id==='settingsCrewList'){
      const next={};order.forEach(g=>{if(CREW_GROUPS[g])next[g]=CREW_GROUPS[g]});Object.keys(CREW_GROUPS).forEach(g=>{if(!next[g])next[g]=CREW_GROUPS[g]});CREW_GROUPS=next;
    }else if(d.container.id==='settingsVehiclesList'){
      const next={};order.forEach(g=>{if(VEHICLE_GROUPS[g])next[g]=VEHICLE_GROUPS[g]});Object.keys(VEHICLE_GROUPS).forEach(g=>{if(!next[g])next[g]=VEHICLE_GROUPS[g]});VEHICLE_GROUPS=next;
    }
    saveManagedLists();renderSettingsManagers();renderCrewVehicles();toast('Group order saved');return;
  }
  const first=d.container.querySelector('.managerItem');
  if(!first)return;
  const scope=first.dataset.dragScope;
  const group=dec(first.dataset.group||'');
  const values=[...d.container.querySelectorAll(':scope > .managerItem')].map(r=>dec(r.dataset.value||'')).filter(Boolean);
  const key=groupPageKey(scope==='crewGroupItem'?'crewGroup':'vehGroup',group);
  const page=settingsPages[key]||0;
  const start=page*SETTINGS_PAGE_SIZE;
  if(scope==='crewGroupItem'&&CREW_GROUPS[group]){
    const list=[...CREW_GROUPS[group]];list.splice(start,values.length,...values);CREW_GROUPS[group]=uniqueCleanList(list,[]);
  }else if(scope==='vehGroupItem'&&VEHICLE_GROUPS[group]){
    const list=[...VEHICLE_GROUPS[group]];list.splice(start,values.length,...values);VEHICLE_GROUPS[group]=uniqueCleanList(list,[]);
  }
  saveManagedLists();renderSettingsManagers();renderCrewVehicles();toast('Order saved');
}


function filterSettingsBlocks(q){
  q=String(q||'').trim().toLowerCase();
  document.querySelectorAll('#settingsPanel .settingsBlock').forEach(block=>{
    const text=block.textContent.toLowerCase();
    block.style.display=(!q||text.includes(q))?'':'none';
  });
  document.querySelectorAll('#settingsPanel .settingsCategoryTitle').forEach(cat=>{
    let n=cat.nextElementSibling,visible=false;
    while(n&&!n.classList.contains('settingsCategoryTitle')){if(n.classList&&n.classList.contains('settingsBlock')&&n.style.display!=='none'){visible=true;break;}n=n.nextElementSibling;}
    cat.style.display=(!q||visible)?'':'none';
  });
}
function clearCachesAndReload(){
  if(!confirm('Clear app cache and reload? Your local diary data stays saved.'))return;
  Promise.all([
    'serviceWorker' in navigator?navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))):Promise.resolve(),
    window.caches?caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))):Promise.resolve()
  ]).finally(()=>location.reload());
}
function clearLocalDiaryData(){
  if(!confirm('Danger zone: this clears local diary data/settings on this device. Export a backup first. Continue?'))return;
  if(!confirm('Final confirmation: wipe local Field Diary storage?'))return;
  APP_BACKUP_KEYS.forEach(k=>localStorage.removeItem(k));
  localStorage.removeItem(GH_KEY);
  OLD_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));
  toast('Local data cleared');
  setTimeout(()=>location.reload(),600);
}


// Paid polish helpers: smoother panel feel and safer touch feedback
function installPolishHelpers(){
  if(window.__polishInstalled)return;
  window.__polishInstalled=true;
  document.body.classList.add('appReady');
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest('button,.tile,.utilityBtn,.calDay');
    if(b)b.classList.add('tapDown');
  },{passive:true});
  document.addEventListener('pointerup',()=>document.querySelectorAll('.tapDown').forEach(x=>x.classList.remove('tapDown')),{passive:true});
  document.addEventListener('pointercancel',()=>document.querySelectorAll('.tapDown').forEach(x=>x.classList.remove('tapDown')),{passive:true});
}

function init(){installPolishHelpers();loadRDOSettings();loadCrewVehicleLists();installSettingsDragHandles();document.addEventListener('input',e=>{if(['overtimeStart','overtimeFinish','partDayLeaveStart','partDayLeaveFinish','allowanceDetails'].includes(e.target.id))saveLocal();if(e.target.id==='quickNote'){localStorage.setItem(QUICK_KEY,e.target.value);autoGrowQuickNote();}if(e.target.id==='weekSearch')renderWeekly();if(e.target.closest('#settingsPanel'))savePay()});restoreUI();setupSwipes();initScrollTopButton();setInterval(()=>syncGitHubBackupNow(false),15000);if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}


/* === Quick Note UX final fix: instant focus + swipe down close === */
(function(){
  const originalOpenPanel = openPanel;
  openPanel = function(id, vibe=true){
    originalOpenPanel(id, vibe);
    if(id === 'quickPanel'){
      const panel=document.getElementById('quickPanel');
      const isMapMode=panel&&panel.dataset.mode==='maps';
      const q = document.getElementById('quickNote');
      if(q && !isMapMode){
        writeEntryToForm();
        autoGrowQuickNote();
        requestAnimationFrame(()=>{
          q.focus({preventScroll:true});
          const len = q.value.length;
          try{ q.setSelectionRange(len, len); }catch(e){}
        });
        setTimeout(()=>{
          q.focus({preventScroll:true});
          const len = q.value.length;
          try{ q.setSelectionRange(len, len); }catch(e){}
        },120);
      }
    }
  };

  window.installQuickNoteFinalUX = function(){
    const panel = document.getElementById('quickPanel');
    if(!panel || panel.dataset.quickUxFinal === '1') return;
    panel.dataset.quickUxFinal = '1';
    let sy=0, sx=0, active=false;
    panel.addEventListener('pointerdown', e=>{
      // Only swipe from header/empty panel/card area, never from inside textarea or inputs.
      if(e.target.closest('textarea,input,button,select')) return;
      active=true; sy=e.clientY||0; sx=e.clientX||0;
    }, {passive:true});
    panel.addEventListener('pointerup', e=>{
      if(!active) return; active=false;
      const dy=(e.clientY||0)-sy; const dx=Math.abs((e.clientX||0)-sx);
      if(dy>70 && dx<80){ closePanel(); haptic('light'); }
    }, {passive:true});
    const head = panel.querySelector('.panelHead');
    if(head){
      head.addEventListener('pointerdown', e=>{active=true; sy=e.clientY||0; sx=e.clientX||0;}, {passive:true});
      head.addEventListener('pointerup', e=>{
        if(!active) return; active=false;
        const dy=(e.clientY||0)-sy; const dx=Math.abs((e.clientX||0)-sx);
        if(dy>45 && dx<80){ closePanel(); haptic('light'); }
      }, {passive:true});
    }
  };
})();

init();
installQuickNoteFinalUX();


function activeScrollContainer(){
  const open=document.querySelector('.panel.open .panelBody');
  return open || document.scrollingElement || document.documentElement;
}
function updateScrollTopButton(){
  const btn=document.getElementById('scrollTopBtn');
  if(!btn)return;
  const box=activeScrollContainer();
  const top=(box===document.scrollingElement||box===document.documentElement)?(window.scrollY||document.documentElement.scrollTop||0):box.scrollTop;
  const canScroll=(box.scrollHeight||0)>(box.clientHeight||window.innerHeight)+180;
  btn.classList.toggle('show', canScroll && top>220);
}
function scrollCurrentPageTop(){
  const box=activeScrollContainer();
  if(box===document.scrollingElement||box===document.documentElement)window.scrollTo({top:0,behavior:'smooth'});
  else box.scrollTo({top:0,behavior:'smooth'});
  setTimeout(updateScrollTopButton,250);
}
function initScrollTopButton(){
  window.addEventListener('scroll',updateScrollTopButton,{passive:true});
  document.querySelectorAll('.panelBody').forEach(b=>b.addEventListener('scroll',updateScrollTopButton,{passive:true}));
  document.addEventListener('click',()=>setTimeout(updateScrollTopButton,120),true);
  setTimeout(updateScrollTopButton,300);
}



function getFatigueStatusForDate(date){
  try{
    if(typeof fatigueStatusForDate === 'function'){
      const r=fatigueStatusForDate(date);
      if(r.cls==='breach')return {level:'breach'};
      if(r.cls==='warn')return {level:'warn'};
    }
  }catch(e){}
  return null;
}

function calendarStatusDetailsForDate(date){
  const entries = getEntries();
  const e = migrate(entries[date], date);
  const details = [];
  const status = statusText(e);
  details.push(['Type', isRosterRDODate(date)&&status==='Normal'?'Rostered Day Off':status]);
  if(isRosterRDODate(date)) details.push(['Roster', 'Rostered Day Off']);
  if(e.flags?.rdoWorked) details.push(['Pay', 'RDO worked']);
  if(e.flags?.publicHolidayWorked) details.push(['Pay', 'Public holiday worked']);
  if(e.flags?.publicHoliday && !e.flags?.publicHolidayWorked) details.push(['Pay', 'Public holiday paid normal hours']);
  if(e.flags?.nightshift) details.push(['Allowance', 'Nightshift']);
  if(e.flags?.onCall) details.push(['Fatigue', 'On-call day — not a rest day']);
  if(!isCompleteEntry(e) && !isFuture(date)) details.push(['Warning', 'Incomplete / missing info']);
  const f = (typeof getFatigueStatusForDate === 'function') ? getFatigueStatusForDate(date) : null;
  if(f && f.level){
    if(f.level === 'breach') details.push(['Fatigue', 'Break required / breach']);
    else if(f.level === 'warn') details.push(['Fatigue', 'Near fatigue limit']);
  }
  if(typeof getLastAllowedWorkDay === 'function' && getLastAllowedWorkDay() === date) details.push(['Fatigue', 'Last day allowed to work before break needed']);
  if(details.length === 1 && status === 'Normal') details.push(['Info', 'No warnings found']);
  return details;
}

function showCalendarDayInfo(date){
  const box = document.getElementById('calendarDayInfo');
  if(!box) return;
  const rows = calendarStatusDetailsForDate(date).map(([k,v]) => `<div class="calendarInfoPill"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
  box.innerHTML = `<div class="calendarInfoTitle">${esc(fullDate(date))}</div><div class="calendarInfoList">${rows}</div>`;
  box.classList.remove('hidden');
}

function getLastAllowedWorkDay(){
  try{
    if(typeof suggestNextRestDay==='function'){
      const next=suggestNextRestDay(selectedDate)?.date;
      if(next){const d=new Date(next+'T12:00:00');d.setDate(d.getDate()-1);return iso(d);}
    }
  }catch(e){}
  return '';
}




/* Switching WO unified list patch — FY25/26 */
(function(){
  const SWITCHING_WORKORDERS_KEY='field_diary_switching_workorders_fy2526_v1';
  const DEFAULT_SWITCHING_WORKORDERS=[{"name":"Albany","abbr":"ALB","workOrder":"TW378161"},{"name":"ALCOA Pinjarra","abbr":"APJ","workOrder":"TW378163"},{"name":"Amherst","abbr":"AMT","workOrder":"TW378264"},{"name":"Arkana","abbr":"A","workOrder":"TW377933"},{"name":"Australian Paper Mills","abbr":"APM","workOrder":"TW378076"},{"name":"Baandee","abbr":"BDE","workOrder":"TW378013"},{"name":"Badgingarra","abbr":"BGA","workOrder":"TW378395"},{"name":"Balcatta","abbr":"BCT","workOrder":"TW378383"},{"name":"Beechboro","abbr":"BCH","workOrder":"TW378127"},{"name":"Beenup","abbr":"BNP","workOrder":"TW378166"},{"name":"Belmont","abbr":"BEL","workOrder":"TW377986"},{"name":"Bentley","abbr":"BTY","workOrder":"TW378350"},{"name":"Bibra Lake","abbr":"BIB","workOrder":"TW378335"},{"name":"Black Flag","abbr":"BKF","workOrder":"TW377974"},{"name":"Bluewaters Terminal","abbr":"BLW","workOrder":"TW378341"},{"name":"Boddington","abbr":"BOD","workOrder":"TW378169"},{"name":"Boulder","abbr":"BLD","workOrder":"TW377977"},{"name":"Bounty","abbr":"BNY","workOrder":"TW378016"},{"name":"Bridgetown","abbr":"BTN","workOrder":"TW378175"},{"name":"British Petroleum","abbr":"BP","workOrder":"TW378082"},{"name":"Broken Hill Kwinana","abbr":"BHK","workOrder":"TW378079"},{"name":"Bunbury Harbour","abbr":"BUH","workOrder":"TW378178"},{"name":"Busselton","abbr":"BSN","workOrder":"TW378172"},{"name":"Byford","abbr":"BYF","workOrder":"TW377989"},{"name":"Canning Vale","abbr":"CVE","workOrder":"TW377989"},{"name":"Cannington Terminal","abbr":"CT","workOrder":"TW378091"},{"name":"Capel","abbr":"CAP","workOrder":"TW378232"},{"name":"Carrabin","abbr":"CAR","workOrder":"TW378181"},{"name":"Cataby","abbr":"CTB","workOrder":"TW378019"},{"name":"Chapman","abbr":"CPN","workOrder":"TW378025"},{"name":"Clarence Street","abbr":"CL","workOrder":"TW378022"},{"name":"Clarkson","abbr":"CKN","workOrder":"TW377992"},{"name":"Cockburn Cement","abbr":"CC","workOrder":"TW378332"},{"name":"Cockburn Power Station Terminal","abbr":"CKB","workOrder":"TW378278"},{"name":"Collgar Terminal","abbr":"CGT","workOrder":"TW378371"},{"name":"Collie","abbr":"CO","workOrder":"TW378187"},{"name":"Collie Bess","abbr":"CBB","workOrder":"TW378555"},{"name":"Collier","abbr":"COL","workOrder":"TW377995"},{"name":"Cook Street","abbr":"CK","workOrder":"TW377935"},{"name":"Cottesloe","abbr":"CTE","workOrder":"TW378338"},{"name":"CSBP LTD","abbr":"CBP","workOrder":"TW378085"},{"name":"Cunderdin","abbr":"CUN","workOrder":"TW378028"},{"name":"Darlington","abbr":"D","workOrder":"TW378130"},{"name":"East Perth 66kV","abbr":"EP","workOrder":"TW378235"},{"name":"Edmund Street","abbr":"E","workOrder":"TW378094"},{"name":"Eneabba","abbr":"ENB","workOrder":"TW378031"},{"name":"Eneabba Terminal","abbr":"ENT","workOrder":"TW378399"},{"name":"Flat Rocks Wind Farm","abbr":"FRW","workOrder":"TW378411"},{"name":"Forrestfield","abbr":"FFD","workOrder":"TW378133"},{"name":"Geraldton","abbr":"GTN","workOrder":"TW378034"},{"name":"Gosnells","abbr":"G","workOrder":"TW377998"},{"name":"Guildford Terminal","abbr":"GLT","workOrder":"TW378299"},{"name":"Hadfields","abbr":"H","workOrder":"TW378136"},{"name":"Hay Street","abbr":"HAY","workOrder":"TW377938"},{"name":"Hazelmere","abbr":"HZM","workOrder":"TW378272"},{"name":"Henley Brook","abbr":"HBK","workOrder":"TW378308"},{"name":"James Street","abbr":"JAM","workOrder":"TW377941"},{"name":"Joel Terrace","abbr":"JTE","workOrder":"TW378368"},{"name":"Joondalup","abbr":"JDP","workOrder":"TW378356"},{"name":"Kalamunda","abbr":"K","workOrder":"TW378001"},{"name":"Kalbarri","abbr":"KBR","workOrder":"TW378311"},{"name":"Katanning","abbr":"KAT","workOrder":"TW378190"},{"name":"Kellerberrin","abbr":"KEL","workOrder":"TW378040"},{"name":"Kemerton","abbr":"KEM","workOrder":"TW378193"},{"name":"Kemerton Power","abbr":"KMP","workOrder":"TW378293"},{"name":"Kenwick Link","abbr":"KNL","workOrder":"TW378317"},{"name":"Kerr Mcgee Kwinana","abbr":"KMK","workOrder":"TW378097"},{"name":"Kewdale","abbr":"KDL","workOrder":"TW378344"},{"name":"Kojonup","abbr":"KOJ","workOrder":"TW378196"},{"name":"Kondinin","abbr":"KDN","workOrder":"TW378037"},{"name":"Kwinana Big Battery","abbr":"KWB","workOrder":"TW378550"},{"name":"Kwinana Desalination Plant","abbr":"KDP","workOrder":"TW378329"},{"name":"Kwinana Terminal","abbr":"KW","workOrder":"TW378238"},{"name":"Landsdale","abbr":"LDE","workOrder":"TW378266"},{"name":"Landwehr Terminal","abbr":"LWT","workOrder":"TW378347"},{"name":"Leath Road","abbr":"LTH","workOrder":"TW378549"},{"name":"Maddington","abbr":"MDN","workOrder":"TW378377"},{"name":"Malaga","abbr":"MLG","workOrder":"TW378275"},{"name":"Mandurah","abbr":"MH","workOrder":"TW378103"},{"name":"Manjimup","abbr":"MJP","workOrder":"TW378199"},{"name":"Manning Street","abbr":"MA","workOrder":"TW377944"},{"name":"Margaret River","abbr":"MR","workOrder":"TW378202"},{"name":"Marriott Road","abbr":"MRR","workOrder":"TW378205"},{"name":"Mason Road","abbr":"MSR","workOrder":"TW378106"},{"name":"Mason Road North","abbr":"MRN","workOrder":"TW378554"},{"name":"Meadow Springs","abbr":"MSS","workOrder":"TW378284"},{"name":"Medical Centre","abbr":"MCE","workOrder":"TW378389"},{"name":"Medina","abbr":"MED","workOrder":"TW378100"},{"name":"Merredin","abbr":"MER","workOrder":"TW378043"},{"name":"Merredin Terminal","abbr":"MRT","workOrder":"TW378052"},{"name":"Midland Junction","abbr":"MJ","workOrder":"TW378139"},{"name":"Milligan Street","abbr":"MIL","workOrder":"TW377947"},{"name":"Moora","abbr":"MOR","workOrder":"TW378049"},{"name":"Morley","abbr":"MO","workOrder":"TW378142"},{"name":"Mount Barker","abbr":"MBR","workOrder":"TW378269"},{"name":"Mount Lawley","abbr":"MLA","workOrder":"TW377950"},{"name":"Muchea","abbr":"MUC","workOrder":"TW378145"},{"name":"Muja Terminal","abbr":"MU","workOrder":"TW378241"},{"name":"Mullaloo","abbr":"MUL","workOrder":"TW378148"},{"name":"Mumbida Wind Farm (WP)","abbr":"MBA","workOrder":"TW378386"},{"name":"Mundaring Weir","abbr":"MW","workOrder":"TW378151"},{"name":"Munday","abbr":"MDY","workOrder":"TW378362"},{"name":"Mungarra","abbr":"MGA","workOrder":"TW378046"},{"name":"Murdoch","abbr":"MUR","workOrder":"TW378314"},{"name":"Myaree","abbr":"MYR","workOrder":"TW378109"},{"name":"Narrogin","abbr":"NGN","workOrder":"TW378208"},{"name":"Narrogin South","abbr":"NGS","workOrder":"TW378211"},{"name":"Nedlands","abbr":"N","workOrder":"TW377953"},{"name":"Neerabup Terminal","abbr":"NBT","workOrder":"TW378326"},{"name":"North Beach","abbr":"NB","workOrder":"TW377956"},{"name":"North Perth","abbr":"NP","workOrder":"TW377959"},{"name":"Northam","abbr":"NOR","workOrder":"TW378055"},{"name":"Northern Terminal","abbr":"NT","workOrder":"TW378244"},{"name":"Oakley","abbr":"OLY","workOrder":"TW378320"},{"name":"O'Connor","abbr":"OC","workOrder":"TW378112"},{"name":"Osborne Park","abbr":"OP","workOrder":"TW377962"},{"name":"Padbury","abbr":"PBY","workOrder":"TW378323"},{"name":"Parkeston","abbr":"PKS","workOrder":"TW378305"},{"name":"Piccadilly","abbr":"PCY","workOrder":"TW377980"},{"name":"Picton","abbr":"PIC","workOrder":"TW378214"},{"name":"Pinjar","abbr":"PJR","workOrder":"TW378247"},{"name":"Pinjarra","abbr":"PNJ","workOrder":"TW378115"},{"name":"Quinninup","abbr":"QNP","workOrder":"TW378217"},{"name":"Rangeway","abbr":"RAN","workOrder":"TW378296"},{"name":"Regans","abbr":"RGN","workOrder":"TW378058"},{"name":"Riverton","abbr":"RTN","workOrder":"TW378121"},{"name":"Rivervale 132kV","abbr":"RVE","workOrder":"TW378281"},{"name":"Rockingham","abbr":"RO","workOrder":"TW378118"},{"name":"Sawyers Valley 132kV","abbr":"SVY","workOrder":"TW378365"},{"name":"Shenton Park","abbr":"SPK","workOrder":"TW378392"},{"name":"Shotts","abbr":"SHO","workOrder":"TW378253"},{"name":"South Fremantle","abbr":"SF","workOrder":"TW378250"},{"name":"Southern Cross","abbr":"SX","workOrder":"TW378061"},{"name":"Southern River","abbr":"SNR","workOrder":"TW378290"},{"name":"Southern Terminal","abbr":"ST","workOrder":"TW378256"},{"name":"Three Springs","abbr":"TS","workOrder":"TW378064"},{"name":"Three Springs Terminal","abbr":"TST","workOrder":"TW378380"},{"name":"Victoria Park","abbr":"VP","workOrder":"TW378007"},{"name":"Wagerup","abbr":"WGP","workOrder":"TW378226"},{"name":"Wagin","abbr":"WAG","workOrder":"TW378220"},{"name":"Waikiki","abbr":"WAI","workOrder":"TW378287"},{"name":"Walkaway Windfarm","abbr":"WWF","workOrder":"TW378302"},{"name":"Wangara","abbr":"WGA","workOrder":"TW378359"},{"name":"Wanneroo","abbr":"WNO","workOrder":"TW378154"},{"name":"Wellington Street","abbr":"W","workOrder":"TW377965"},{"name":"Wells Terminal","abbr":"WLT","workOrder":"TW378353"},{"name":"Welshpool","abbr":"WE","workOrder":"TW378010"},{"name":"Wembley Downs","abbr":"WD","workOrder":"TW377968"},{"name":"West Kalgoorlie Terminal","abbr":"WKT","workOrder":"TW377983"},{"name":"Western Collieries Limited","abbr":"WCL","workOrder":"TW378223"},{"name":"Western Mining","abbr":"WM","workOrder":"TW378124"},{"name":"Western Terminal","abbr":"WT","workOrder":"TW378259"},{"name":"WHITEMAN PARK","abbr":"WHT","workOrder":"TW378553"},{"name":"Willetton","abbr":"WLN","workOrder":"TW378374"},{"name":"Worsley","abbr":"WOR","workOrder":"TW378229"},{"name":"Wundowie","abbr":"WUN","workOrder":"TW378067"},{"name":"Yanchep","abbr":"YP","workOrder":"TW378157"},{"name":"Yandin Terminal","abbr":"YDT","workOrder":"TW378402"},{"name":"Yandin Wind Farm","abbr":"YDW","workOrder":"TW378546"},{"name":"Yerbillon","abbr":"YER","workOrder":"TW378070"},{"name":"Yilgarn","abbr":"YLN","workOrder":"TW378073"},{"name":"Yokine","abbr":"Y","workOrder":"TW377971"}];
  function norm(s){return String(s||'').trim().toLowerCase();}
  function cleanSwitchingWorkOrders(list){
    const src=Array.isArray(list)?list:[];
    const out=[]; const seen=new Set();
    src.forEach(x=>{
      const name=String(x&&x.name||'').trim();
      const abbr=String(x&&x.abbr||'').trim().toUpperCase();
      const workOrder=String(x&&x.workOrder||'').trim().toUpperCase();
      if(!name&&!abbr&&!workOrder)return;
      const key=(name||abbr).toLowerCase();
      if(seen.has(key))return;
      seen.add(key);
      out.push({name,abbr,workOrder});
    });
    return out.sort((a,b)=>String(a.name||a.abbr).localeCompare(String(b.name||b.abbr),undefined,{sensitivity:'base'}));
  }
  window.getSwitchingWorkOrders=function(){
    let current=null;
    try{current=JSON.parse(localStorage.getItem(SWITCHING_WORKORDERS_KEY)||'null');}catch(e){current=null;}
    const list=cleanSwitchingWorkOrders(current&&current.length?current:DEFAULT_SWITCHING_WORKORDERS);
    localStorage.setItem(SWITCHING_WORKORDERS_KEY,JSON.stringify(list));
    return list;
  };
  window.saveSwitchingWorkOrders=function(list){localStorage.setItem(SWITCHING_WORKORDERS_KEY,JSON.stringify(cleanSwitchingWorkOrders(list)));};
  window.switchingLabel=function(x){return (x.name||'')+(x.abbr?' ('+x.abbr+')':'');};
  window.switchingValue=function(x){return x.name||x.abbr||'';};
  window.switchingWorkOrderFor=function(value){
    const v=norm(value);
    if(!v)return '';
    const row=getSwitchingWorkOrders().find(x=>norm(x.name)===v||norm(x.abbr)===v||norm((x.name||'')+' ('+(x.abbr||'')+')')===v||norm((x.name||'')+' - '+(x.abbr||''))===v);
    return row?row.workOrder:'';
  };
  window.switchingOptionsHTML=function(value){
    const v=norm(value);
    return getSwitchingWorkOrders().map(x=>{
      const val=switchingValue(x);
      const selected=(norm(val)===v||norm(x.abbr)===v)?'selected':'';
      return `<option value="${esc(val)}" ${selected}>${esc(switchingLabel(x))}</option>`;
    }).join('');
  };
  window.switchingDatalistOptionsHTML=function(){
    return getSwitchingWorkOrders().map(x=>`<option value="${esc(switchingValue(x))}">${esc(switchingLabel(x))}</option>`).join('');
  };
  window.syncSubstationsFromSwitchingWorkOrders=function(){
    try{
      const names=getSwitchingWorkOrders().map(switchingValue).filter(Boolean);
      if(Array.isArray(window.SUBSTATIONS)){
        names.forEach(n=>{if(!SUBSTATIONS.some(x=>norm(x)===norm(n)))SUBSTATIONS.push(n);});
        if(typeof alphaList==='function')SUBSTATIONS=alphaList(SUBSTATIONS);
        if(typeof setJSON==='function'&&typeof SUBSTATION_LIST_KEY!=='undefined')setJSON(SUBSTATION_LIST_KEY,SUBSTATIONS);
      }
      const sub=document.getElementById('substationOptionsList'); if(sub)sub.innerHTML=switchingDatalistOptionsHTML();
    }catch(e){console.warn('Substation sync skipped',e);}
  };
  const oldRefresh=window.refreshSearchableDatalists;
  window.refreshSearchableDatalists=function(){
    if(oldRefresh)oldRefresh();
    const sub=document.getElementById('substationOptionsList'); if(sub)sub.innerHTML=switchingDatalistOptionsHTML();
  };
  window.updateSwitchingSubstation=function(id,value){
    if(isEntryLocked(entry)){toast(lockReason(entry));return;}
    const j=entry.jobs.find(x=>x.id===id); if(!j)return;
    j.switchingSubstation=value;
    const wo=switchingWorkOrderFor(value);
    j.switchingWorkOrder=wo||j.switchingWorkOrder||'';
    if(typeof saveJobsQuiet==='function')saveJobsQuiet(); else saveLocal();
    if(typeof refreshJobCard==='function')refreshJobCard(id); else renderJobs();
    if(typeof debouncedAutoSync==='function')debouncedAutoSync();
  };
  const oldUpdateJob=window.updateJob;
  window.updateJob=function(id,k,v){
    if(k==='switchingSubstation')return updateSwitchingSubstation(id,v);
    return oldUpdateJob?oldUpdateJob(id,k,v):undefined;
  };
  const oldUpdateSwitchingRow=window.updateSwitchingRow;
  window.updateSwitchingRow=function(id,idx,key,value){
    if(oldUpdateSwitchingRow)return oldUpdateSwitchingRow(id,idx,key,value);
    const j=entry.jobs.find(x=>x.id===id); if(!j)return;
    j.switchingRows=switchingRowsForJob(j);
    if(!j.switchingRows[idx])j.switchingRows[idx]={swop:'',substation:''};
    j.switchingRows[idx][key]=value;
    if(typeof saveJobsQuiet==='function')saveJobsQuiet(); else saveLocal();
    if(typeof refreshJobCard==='function')refreshJobCard(id); else renderJobs();
  };
  window.switchingHTML=function(j){
    if(!jobHasType(j,'Switching'))return '';
    const rows=switchingRowsForJob(j);
    const missing=!switchingRowsComplete(j);
    const swopOptionsFor=(val)=>(Array.isArray(SWOPS)?SWOPS:[]).map(x=>`<option value="${esc(x)}" ${String(val||'')===x?'selected':''}>${esc(x)}</option>`).join('');
    const subOptionsFor=(val)=>switchingOptionsHTML(val);
    return `<div class="switchingBox ${missing?'requiredMissing':''}">
      <div class="jobTitle">Switching Details ${missing?'<span class="missingLabel">Required</span>':''}</div>
      <p class="rateHint">Substation dropdowns use the FY25/26 Substation Switching Work Orders list. Work order auto-fills and remains editable.</p>

      <label>Substation ${!String(j.switchingSubstation||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
      <select class="${!String(j.switchingSubstation||'').trim()?'requiredMissing':''}" onchange="updateSwitchingSubstation('${j.id}',this.value)">
        <option value="">Select substation</option>${subOptionsFor(j.switchingSubstation)}
      </select>

      <label>Restoration or Isolation ${!String(j.switchingAction||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
      <select class="${!String(j.switchingAction||'').trim()?'requiredMissing':''}" onchange="updateJob('${j.id}','switchingAction',this.value)">
        <option value="">Select</option>
        <option value="Restoration" ${j.switchingAction==='Restoration'?'selected':''}>Restoration</option>
        <option value="Isolation" ${j.switchingAction==='Isolation'?'selected':''}>Isolation</option>
      </select>

      <label>Substation Switching Work Order ${!String(j.switchingWorkOrder||'').trim()?'<span class="missingLabel">Required</span>':''}</label>
      <input class="${!String(j.switchingWorkOrder||'').trim()?'requiredMissing':''}" value="${esc(j.switchingWorkOrder||'')}" placeholder="Auto-fills from selected substation" oninput="updateJob('${j.id}','switchingWorkOrder',this.value)">

      <div class="settingsDivider"></div>
      <div class="jobTitle">Other Switching Operator</div>`+
      rows.map((r,idx)=>`<div class="switchingRow">
        <div><label>Other SWOP ${!String(r.swop||'').trim()?'<span class="missingLabel">Required</span>':''}</label><select class="${!String(r.swop||'').trim()?'requiredMissing':''}" onchange="updateSwitchingRow('${j.id}',${idx},'swop',this.value)"><option value="">Select other SWOP</option>${swopOptionsFor(r.swop)}</select></div>
        <div><label>Substation ${!String(r.substation||'').trim()?'<span class="missingLabel">Required</span>':''}</label><select class="${!String(r.substation||'').trim()?'requiredMissing':''}" onchange="updateSwitchingRow('${j.id}',${idx},'substation',this.value)"><option value="">Select substation</option>${subOptionsFor(r.substation)}</select></div>
        <button type="button" class="danger small" onclick="removeSwitchingRow('${j.id}',${idx})">Remove</button>
      </div>`).join('')+
      `<button type="button" class="primary" style="width:100%;margin-top:10px" onclick="addSwitchingRow('${j.id}')">Add another SWOP + Substation</button>
      </div>`;
  };
  function rowHTML(x,i){
    return `<div class="managerItem switchingWOItem" style="grid-template-columns:1.15fr .55fr .8fr auto;align-items:end">
      <div><label>Substation Name</label><input value="${esc(x.name||'')}" onchange="editSwitchingWorkOrder(${i},'name',this.value)"></div>
      <div><label>Abbr</label><input value="${esc(x.abbr||'')}" onchange="editSwitchingWorkOrder(${i},'abbr',this.value)"></div>
      <div><label>Work Order</label><input value="${esc(x.workOrder||'')}" onchange="editSwitchingWorkOrder(${i},'workOrder',this.value)"></div>
      <button class="managerDelete" onclick="deleteSwitchingWorkOrder(${i})">Remove</button>
    </div>`;
  }
  window.renderSwitchingWorkOrderSettings=function(){
    const box=document.getElementById('settingsSwitchingWorkOrdersList'); if(!box)return;
    const list=getSwitchingWorkOrders();
    box.innerHTML=list.length?list.map(rowHTML).join(''):'<div class="settingsEmpty">No switching work orders saved.</div>';
    const count=document.getElementById('switchingWorkOrderCount'); if(count)count.textContent=list.length+' saved';
  };
  window.editSwitchingWorkOrder=function(i,key,value){
    const list=getSwitchingWorkOrders(); if(!list[i])return;
    list[i][key]=String(value||'').trim(); saveSwitchingWorkOrders(list); syncSubstationsFromSwitchingWorkOrders(); renderSwitchingWorkOrderSettings(); renderJobs(false); toast('Switching work order updated');
  };
  window.deleteSwitchingWorkOrder=function(i){
    if(!confirm('Remove this switching work order?'))return;
    const list=getSwitchingWorkOrders(); list.splice(i,1); saveSwitchingWorkOrders(list); syncSubstationsFromSwitchingWorkOrders(); renderSwitchingWorkOrderSettings(); renderJobs(false); toast('Switching work order removed');
  };
  window.addSwitchingWorkOrder=function(){
    const name=(document.getElementById('newSwitchingWOName')?.value||'').trim();
    const abbr=(document.getElementById('newSwitchingWOAbbr')?.value||'').trim().toUpperCase();
    const workOrder=(document.getElementById('newSwitchingWOWorkOrder')?.value||'').trim().toUpperCase();
    if(!name||!workOrder){toast('Name and work order required');return;}
    const list=getSwitchingWorkOrders(); list.push({name,abbr,workOrder}); saveSwitchingWorkOrders(list); syncSubstationsFromSwitchingWorkOrders();
    ['newSwitchingWOName','newSwitchingWOAbbr','newSwitchingWOWorkOrder'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    renderSwitchingWorkOrderSettings(); renderJobs(false); toast('Switching work order added');
  };
  window.resetSwitchingWorkOrdersFY2526=function(){
    if(!confirm('Reset switching work orders back to the FY25/26 PDF list? This will overwrite edits.'))return;
    saveSwitchingWorkOrders(DEFAULT_SWITCHING_WORKORDERS); syncSubstationsFromSwitchingWorkOrders(); renderSwitchingWorkOrderSettings(); renderJobs(false); toast('FY25/26 work orders restored');
  };
  function injectSettingsBlock(){
    if(document.getElementById('settingsBlock_switchingWorkOrders')){renderSwitchingWorkOrderSettings();return;}
    const after=document.getElementById('settingsBlock_substations'); if(!after)return;
    const div=document.createElement('div');
    div.className='card settingsBlock'; div.id='settingsBlock_switchingWorkOrders';
    div.innerHTML=`<div class="settingsBlockHeader" onclick="toggleSettingsBlock('switchingWorkOrders')"><h3>Substation Switching Work Orders</h3><span class="settingsBadge" id="switchingWorkOrderCount">FY25/26</span></div><div class="settingsContent"><p class="settingsLockHint"><b>Note:</b> these switching work orders currently only apply for 2025/2026 and may need updating in future.</p><div id="settingsSwitchingWorkOrdersList" class="managerList"></div><div class="settingsDivider"></div><div class="grid2"><div><label>Substation Name</label><input id="newSwitchingWOName" placeholder="Example: Albany"></div><div><label>Abbreviation</label><input id="newSwitchingWOAbbr" placeholder="Example: ALB"></div></div><label>Work Order</label><input id="newSwitchingWOWorkOrder" placeholder="Example: TW378161"><div class="grid2" style="margin-top:10px"><button class="primary" onclick="addSwitchingWorkOrder()">Add Work Order</button><button onclick="resetSwitchingWorkOrdersFY2526()">Reset FY25/26 List</button></div></div>`;
    after.insertAdjacentElement('afterend',div); renderSwitchingWorkOrderSettings();
  }
  const oldRenderSettingsManagers=window.renderSettingsManagers;
  window.renderSettingsManagers=function(){if(oldRenderSettingsManagers)oldRenderSettingsManagers(); injectSettingsBlock();};
  const style=document.createElement('style');
  style.textContent=`.switchingWOItem input{padding:10px 11px;border-radius:13px}@media(max-width:520px){.switchingWOItem{grid-template-columns:1fr!important}.switchingWOItem .managerDelete{width:100%}}`;
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded',()=>{syncSubstationsFromSwitchingWorkOrders(); setTimeout(()=>{injectSettingsBlock(); if(typeof renderJobs==='function')renderJobs(false);},120);});
  setTimeout(()=>{syncSubstationsFromSwitchingWorkOrders(); injectSettingsBlock(); if(typeof renderJobs==='function')renderJobs(false);},300);
})();


/* External script copy note: double-tap dropdown keyboard patch is embedded in index.html for this build. */



/* === SAFE ESSENTIAL PAY PATCH 2026-05-07 === */
(function(){
  if(window.__safeEssentialPayPatchInstalled)return;
  window.__safeEssentialPayPatchInstalled=true;

  const PAY_EXTRA_FIELD_IDS=[
    'payOtMealUnits','paySiteOtHours','payAccommodationUnits','payIncidentalUnits',
    'payDailyReimbUnits','payCustomAmount','payFutureText1','payFutureText2','payPayNotes'
  ];

  function toNum(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function safeGetJSON(k,f){try{return JSON.parse(localStorage.getItem(k)||'') || f}catch(e){return f}}
  function safeSetJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function readExtra(e){
    e=e||{};
    return {
      meal:toNum(e.payOtMealUnits),
      siteOt:toNum(e.paySiteOtHours),
      accom:toNum(e.payAccommodationUnits),
      incidentals:toNum(e.payIncidentalUnits),
      daily:toNum(e.payDailyReimbUnits),
      custom:toNum(e.payCustomAmount)
    };
  }

  function installStyles(){
    if(document.getElementById('safeEssentialPayStyles'))return;
    const s=document.createElement('style');
    s.id='safeEssentialPayStyles';
    s.textContent=`
      .essentialPayGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      .essentialPayGrid textarea{min-height:74px}
      .payMiniHint{margin:8px 0 0;color:#667085;font-size:12px;font-weight:800;line-height:1.35}
      .payDivider{height:1px;background:#eef2f6;margin:14px 0}
      @media(max-width:430px){.essentialPayGrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function addDailyPayFields(){
    installStyles();
    const panel=document.querySelector('#hoursPanel .panelBody');
    if(!panel || document.getElementById('essentialPayCard'))return;
    const card=document.createElement('div');
    card.className='card';
    card.id='essentialPayCard';
    card.innerHTML=`
      <div class="sectionState"><b>Pay Calculation Extras</b><span class="state ok">Optional</span></div>
      <p class="payMiniHint">Only fill these if needed for payslip checking. Leave blank if not applicable.</p>
      <div class="essentialPayGrid">
        <div><label>OT Meal Allowance Units</label><input class="payExtraInput" id="payOtMealUnits" type="number" step="0.01" placeholder="e.g. 1"></div>
        <div><label>Site Allowance OT Hours</label><input class="payExtraInput" id="paySiteOtHours" type="number" step="0.01" placeholder="Auto from OT if blank"></div>
        <div><label>Accommodation Units</label><input class="payExtraInput" id="payAccommodationUnits" type="number" step="0.01" placeholder="e.g. 1"></div>
        <div><label>Incidental Units</label><input class="payExtraInput" id="payIncidentalUnits" type="number" step="0.01" placeholder="e.g. 1"></div>
        <div><label>Daily Reimb Units</label><input class="payExtraInput" id="payDailyReimbUnits" type="number" step="0.01" placeholder="e.g. 1"></div>
        <div><label>Manual Adjustment $</label><input class="payExtraInput" id="payCustomAmount" type="number" step="0.01" placeholder="+/- amount"></div>
      </div>
      <div class="payDivider"></div>
      <label>Future Pay Field 1</label><input class="payExtraInput" id="payFutureText1" placeholder="Spare field for later pay rule">
      <label>Future Pay Field 2</label><input class="payExtraInput" id="payFutureText2" placeholder="Spare field for later pay rule">
      <label>Pay Notes</label><textarea class="payExtraInput" id="payPayNotes" placeholder="Anything odd for this day"></textarea>
    `;
    panel.appendChild(card);
  }

  function addOnCallButtons(){
    const grid=document.querySelector('#hoursPanel .btnGrid');
    if(!grid)return;
    if(!document.getElementById('onCallWeekendBtn')){
      const b=document.createElement('button');
      b.className='choice';
      b.id='onCallWeekendBtn';
      b.type='button';
      b.textContent='On-call Weekend/PH';
      b.onclick=function(){ if(typeof toggleAllowanceFlag==='function')toggleAllowanceFlag('onCallWeekend'); };
      grid.appendChild(b);
    }
    if(!document.getElementById('onCallPHBtn')){
      const b=document.createElement('button');
      b.className='choice';
      b.id='onCallPHBtn';
      b.type='button';
      b.textContent='On-call PH';
      b.onclick=function(){ if(typeof toggleAllowanceFlag==='function')toggleAllowanceFlag('onCallPH'); };
      grid.appendChild(b);
    }
  }

  function payDefaults(){
    return {
      base:63.16,onCall:84.80,onCallWeekend:169.59,onCallPH:169.59,nightshift:0,laha:0,incon:30,higher:0,allow:0,
      siteOTE:187.50,siteOt:2.50,meal:38.65,accommodation:50,incidentals:24.50,dailyReimb:61.30
    };
  }

  function getPaySettingsSafe(){
    const old=(typeof paySettings==='function') ? paySettings() : {};
    const saved=safeGetJSON(typeof PAY_KEY!=='undefined'?PAY_KEY:'field_diary_pay_v1',{});
    return {...payDefaults(),...old,...saved};
  }

  function addPayRateFields(){
    installStyles();
    const block=document.querySelector('#settingsBlock_pay .settingsContent');
    if(!block || document.getElementById('essentialPayRates'))return;
    const div=document.createElement('div');
    div.id='essentialPayRates';
    div.innerHTML=`
      <div class="payDivider"></div>
      <h3 class="settingsGroupTitle">Payslip Allowance Rates</h3>
      <p class="settingsLockHint">Pre-filled from the pay advice examples. Change later if rates update.</p>
      <div class="essentialPayGrid">
        <div><label>Site Allowance OTE / Week</label><input class="payRateExtra" id="rateSiteOTE" type="number" step="0.01"></div>
        <div><label>Site Allowance OT / Hour</label><input class="payRateExtra" id="rateSiteOT" type="number" step="0.01"></div>
        <div><label>OT Meal Allowance</label><input class="payRateExtra" id="rateMeal" type="number" step="0.01"></div>
        <div><label>Accommodation Allowance</label><input class="payRateExtra" id="rateAccommodation" type="number" step="0.01"></div>
        <div><label>Incidental Expense</label><input class="payRateExtra" id="rateIncidentals" type="number" step="0.01"></div>
        <div><label>Daily Reimb Rate</label><input class="payRateExtra" id="rateDailyReimb" type="number" step="0.01"></div>
      </div>
    `;
    const before=block.querySelector('.payRulesBox');
    if(before)before.insertAdjacentElement('beforebegin',div); else block.appendChild(div);
    fillPayRateFields();
  }

  function fillPayRateFields(){
    const p=getPaySettingsSafe();
    const pairs=[
      ['rateSiteOTE','siteOTE'],['rateSiteOT','siteOt'],['rateMeal','meal'],['rateAccommodation','accommodation'],
      ['rateIncidentals','incidentals'],['rateDailyReimb','dailyReimb'],['rateOnCallWeekend','onCallWeekend'],['rateOnCallPH','onCallPH']
    ];
    pairs.forEach(([id,k])=>{
      const el=document.getElementById(id);
      if(el && document.activeElement!==el)el.value=p[k]||'';
    });
  }

  function savePayRatesSafe(){
    const key=typeof PAY_KEY!=='undefined'?PAY_KEY:'field_diary_pay_v1';
    const old=safeGetJSON(key,{});
    const val=id=>document.getElementById(id)?.value;
    const upd={
      ...old,
      siteOTE:toNum(val('rateSiteOTE') ?? old.siteOTE),
      siteOt:toNum(val('rateSiteOT') ?? old.siteOt),
      meal:toNum(val('rateMeal') ?? old.meal),
      accommodation:toNum(val('rateAccommodation') ?? old.accommodation),
      incidentals:toNum(val('rateIncidentals') ?? old.incidentals),
      dailyReimb:toNum(val('rateDailyReimb') ?? old.dailyReimb),
      onCallWeekend:toNum(val('rateOnCallWeekend') ?? old.onCallWeekend),
      onCallPH:toNum(val('rateOnCallPH') ?? old.onCallPH)
    };
    safeSetJSON(key,upd);
    try{if(typeof renderEarnings==='function')renderEarnings()}catch(e){}
  }

  function writePayExtrasToEntry(){
    if(typeof entry==='undefined' || !entry)return;
    PAY_EXTRA_FIELD_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(el)entry[id]=el.value;
    });
  }

  function fillPayExtrasFromEntry(){
    if(typeof entry==='undefined' || !entry)return;
    PAY_EXTRA_FIELD_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(el && document.activeElement!==el)el.value=entry[id]||'';
    });
  }

  function extraTotalsForWeek(){
    let out={meal:0,siteOt:0,accom:0,incidentals:0,daily:0,custom:0};
    try{
      const entries=getEntries();
      const start=getPayPeriodStart(new Date(selectedDate+'T12:00:00'));
      for(let i=0;i<7;i++){
        const key=iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));
        const e=migrate(entries[key],key);
        const x=readExtra(e);
        out.meal+=x.meal; out.siteOt+=x.siteOt; out.accom+=x.accom; out.incidentals+=x.incidentals; out.daily+=x.daily; out.custom+=x.custom;
      }
    }catch(e){}
    return out;
  }

  function patchEarningsDisplay(){
    const grid=document.getElementById('earnBreakGrid');
    if(!grid || document.getElementById('safePayExtraRows'))return;
    const p=getPaySettingsSafe();
    const ex=extraTotalsForWeek();
    const rows=[
      ['Site Allowance OT hours',ex.siteOt*p.siteOt],
      ['OT Meal Allowance',ex.meal*p.meal],
      ['Accommodation',ex.accom*p.accommodation],
      ['Incidental Expense',ex.incidentals*p.incidentals],
      ['Daily Reimb',ex.daily*p.dailyReimb],
      ['Manual Adjustment',ex.custom]
    ].filter(r=>Math.abs(toNum(r[1]))>0);
    if(!rows.length)return;
    const wrap=document.createElement('div');
    wrap.id='safePayExtraRows';
    wrap.style.gridColumn='1/-1';
    wrap.innerHTML=rows.map(([k,v])=>`<div class="earnLine"><b>${k}</b><span>${typeof money==='function'?money(v):('$'+Math.round(v))}</span></div>`).join('');
    grid.appendChild(wrap);
  }

  // Wrap only UI renderers; do not replace pay calculation core.
  const oldRead=window.readFormToEntry;
  if(typeof oldRead==='function'){
    window.readFormToEntry=function(){const r=oldRead.apply(this,arguments);writePayExtrasToEntry();return r;};
  }
  const oldWrite=window.writeEntryToForm;
  if(typeof oldWrite==='function'){
    window.writeEntryToForm=function(){const r=oldWrite.apply(this,arguments);fillPayExtrasFromEntry();return r;};
  }
  const oldRenderHours=window.renderHours;
  if(typeof oldRenderHours==='function'){
    window.renderHours=function(){
      const r=oldRenderHours.apply(this,arguments);
      addOnCallButtons(); addDailyPayFields(); fillPayExtrasFromEntry();
      try{
        const ok=completion(entry).hours, locked=isEntryLocked(entry);
        [['onCallWeekendBtn','onCallWeekend'],['onCallPHBtn','onCallPH']].forEach(([id,k])=>{
          const el=document.getElementById(id);
          if(el){el.classList.toggle('active',!!entry.flags[k]);el.classList.toggle('requiredMissing',!ok&&!locked);}
        });
      }catch(e){}
      return r;
    };
  }
  const oldOpen=window.openPanel;
  if(typeof oldOpen==='function'){
    window.openPanel=function(id){
      const r=oldOpen.apply(this,arguments);
      setTimeout(()=>{
        if(id==='hoursPanel'){addOnCallButtons();addDailyPayFields();fillPayExtrasFromEntry();}
        if(id==='settingsPanel'){addPayRateFields();fillPayRateFields();}
      },0);
      return r;
    };
  }
  const oldLoad=window.loadPayInputs;
  if(typeof oldLoad==='function'){
    window.loadPayInputs=function(){const r=oldLoad.apply(this,arguments);addPayRateFields();fillPayRateFields();return r;};
  }
  const oldRenderEarn=window.renderEarnings;
  if(typeof oldRenderEarn==='function'){
    window.renderEarnings=function(){const r=oldRenderEarn.apply(this,arguments);patchEarningsDisplay();return r;};
  }

  document.addEventListener('input',function(e){
    if(e.target && e.target.classList && e.target.classList.contains('payExtraInput')){
      writePayExtrasToEntry();
      try{if(typeof saveLocal==='function')saveLocal()}catch(err){}
    }
    if(e.target && e.target.classList && e.target.classList.contains('payRateExtra'))savePayRatesSafe();
  },true);

  function boot(){
    try{addOnCallButtons();addDailyPayFields();addPayRateFields();fillPayExtrasFromEntry();fillPayRateFields();}catch(e){console.warn('safe pay boot skipped',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100));
  else setTimeout(boot,100);
})();
/* === END SAFE ESSENTIAL PAY PATCH === */

