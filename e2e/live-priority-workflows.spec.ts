import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { login } from './helpers';
test.use({actionTimeout:15_000});

for(const role of ['admin','receptionist'] as const){
 test(`${role} saves batches, assigns coaches and promotes a real waitlist`,async({page,academy})=>{
  test.setTimeout(150_000);
  const code='FIX-'+role+'-'+academy.suffix;
  const student=await academy.admin.from('students').insert({student_code:code,full_name:'Waitlist '+code,date_of_birth:'2014-03-01'}).select('id').single();expect(student.error).toBeNull();
  const coach=await academy.admin.from('coaches').select('id').eq('profile_id',academy.coachUserId).single();expect(coach.error).toBeNull();
  let batchId: string;
  try{
   await login(page,`${role}@turf.local`);
   await page.goto('/batches');await page.getByRole('button',{name:'Add Batch',exact:true}).click();
   await page.getByLabel('Batch name *',{exact:true}).fill(code);await page.getByLabel('Batch code *',{exact:true}).fill(code);
   await page.getByLabel('Fee plan *',{exact:true}).selectOption(academy.planId);await page.getByLabel('Waiting list capacity',{exact:true}).fill('2');
   await page.route('**/rest/v1/rpc/save_batch_workspace',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Test save rejected'})}),{times:1});
   await page.getByRole('button',{name:'Save batch',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Test save rejected');await expect(page.getByLabel('Batch name *',{exact:true})).toHaveValue(code);
   await page.getByRole('button',{name:'Save batch',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Batch saved.'})).toBeVisible();
   const saved=await academy.admin.from('batches').select('id,name,waitlist_capacity').eq('code',code).single();expect(saved.error).toBeNull();batchId=saved.data!.id;expect(saved.data!.waitlist_capacity).toBe(2);
   await page.reload();await page.getByPlaceholder('Search by name or code').fill(code);let row=page.getByRole('row').filter({hasText:code});await expect(row).toContainText('0 / 20 enrolled');
   await row.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Capacity *',{exact:true}).fill('4');await page.getByRole('button',{name:'Save batch',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Batch saved.'})).toBeVisible();
   await page.goto('/batches/coach-assignment');const assignment=page.locator('form').filter({has:page.getByRole('button',{name:'Assign coach',exact:true})});
   await assignment.getByLabel('Batch',{exact:true}).selectOption(batchId);await assignment.getByLabel('Coach',{exact:true}).selectOption(coach.data!.id);await assignment.getByRole('button',{name:'Assign coach',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Coach assignment saved.'})).toBeVisible();
   expect((await academy.admin.from('batch_coaches').select('is_primary').eq('batch_id',batchId).eq('coach_id',coach.data!.id).single()).data?.is_primary).toBe(true);
   await page.goto('/batches/capacity');const allocation=page.locator('form').filter({has:page.getByRole('button',{name:'Save allocation',exact:true})});
   await allocation.getByLabel('Student',{exact:true}).selectOption(student.data!.id);await allocation.getByLabel('Destination batch').selectOption(batchId);await allocation.getByLabel('Action',{exact:true}).selectOption('waitlist');await allocation.getByRole('button',{name:'Save allocation',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Student added to waiting list.'})).toBeVisible();
   row=page.getByRole('row').filter({hasText:'Waitlist '+code});await expect(row).toBeVisible();await row.getByRole('button',{name:'Enroll today'}).click();await expect(page.getByRole('status').filter({hasText:'Student enrolled.'})).toBeVisible();await expect(row).toHaveCount(0);
   const enrollment=await academy.admin.from('enrollments').select('id,batch_id,status').eq('student_id',student.data!.id).single();expect(enrollment.error).toBeNull();expect(enrollment.data).toMatchObject({batch_id:batchId,status:'active'});
   await page.reload();await page.getByPlaceholder('Search by name or code').fill(code);await expect(page.getByRole('row').filter({hasText:code})).toContainText('1 / 4 enrolled');
   await page.setViewportSize({width:390,height:844});await page.reload();await expect(page.getByRole('heading',{name:'Batch Capacity',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }finally{
   expect((await academy.admin.rpc('delete_student_profile',{p_student_id:student.data!.id})).error).toBeNull();
   expect((await academy.admin.from('batches').delete().eq('code',code)).error).toBeNull();
  }
 });
}

test('staff detail actions, global search, analytics and invoice download use real data',async({page,academy})=>{
 test.setTimeout(150_000);await login(page,'admin@turf.local');
 const parent=await academy.admin.from('parents').select('id,full_name').eq('status','active').limit(1).single();expect(parent.error).toBeNull();
 const coach=await academy.admin.from('coaches').select('id').eq('profile_id',academy.coachUserId).single();expect(coach.error).toBeNull();
 await page.goto('/parents/'+parent.data!.id);await page.getByRole('button',{name:'Activity',exact:true}).click();await expect(page.getByRole('heading',{name:'Parent and linked student activity'})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'Payment history',exact:true}).click();await expect(page.getByRole('heading',{name:'Payment history for linked students'})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page.getByLabel('Message',{exact:true})).toBeVisible();
 await page.goto('/coaches/'+coach.data!.id);await page.getByRole('button',{name:'Attendance summary',exact:true}).click();await expect(page.getByRole('heading',{name:'Attendance for assigned batches'})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'View schedule',exact:true}).click();await expect(page).toHaveURL(/batches\/schedule\?coach=/);await expect(page.getByRole('row').filter({hasText:'E2E Assigned '+academy.suffix})).toBeVisible();
 await page.goto('/search?q='+encodeURIComponent(academy.suffix));await expect(page.getByRole('link',{name:new RegExp('E2E Assigned '+academy.suffix)})).toHaveCount(2);
 await page.goto('/dashboard');await expect(page.getByLabel('Attendance over the last seven days').locator('.chart-column')).toHaveCount(7);await expect(page.getByLabel('Net collection by payment month').locator('.chart-column')).toHaveCount(6);
 const enrollment=await academy.admin.from('enrollments').select('id').eq('student_id',academy.studentId).single();
 const charge=await academy.admin.from('monthly_charges').insert({enrollment_id:enrollment.data!.id,student_id:academy.studentId,charge_month:new Date().toISOString().slice(0,7)+'-01',due_date:new Date().toISOString().slice(0,10),base_amount:1234.56}).select('id').single();expect(charge.error).toBeNull();
 await page.goto('/fees');await page.getByLabel('Search by student name').fill('E2E Assigned '+academy.suffix);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download invoice for E2E Assigned '+academy.suffix,exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^INV-.*\.pdf$/);const pdf=await readFile((await download.path())!);expect(pdf.subarray(0,8).toString()).toBe('%PDF-1.4');expect(pdf.length).toBeGreaterThan(10000);
 await page.goto('/settings/audit-logs');await expect(page.getByRole('heading',{name:'Audit log',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.goto('/settings/attendance');await expect(page.getByLabel('Attendance grace (minutes)')).toBeVisible();await expect(page.getByLabel('Currency code')).not.toBeVisible();
 const configuration=await academy.admin.functions.invoke('notification-delivery',{body:{action:'configuration'}});expect(configuration.error).toBeNull();expect(configuration.data.channels).toContain('in_app');
});

test('payments recover a lost response and classify partial versus full settlement',async({page,academy})=>{
 test.setTimeout(120_000);await login(page);
 const enrollment=await academy.admin.from('enrollments').select('id').eq('student_id',academy.studentId).single();
 const charge=await academy.admin.from('monthly_charges').insert({enrollment_id:enrollment.data!.id,student_id:academy.studentId,charge_month:new Date().toISOString().slice(0,7)+'-01',due_date:new Date().toISOString().slice(0,10),base_amount:100.50}).select('id').single();expect(charge.error).toBeNull();
 await page.goto('/payments/new');await page.getByLabel('Outstanding charge').selectOption(charge.data!.id);await page.getByLabel('Amount').fill('40.25');
 await page.route('**/rest/v1/rpc/record_payment',async route=>{const response=await route.fetch();expect(response.ok()).toBe(true);await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Test lost response'})});},{times:1});
 await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect(page.getByRole('status')).toContainText('Payment recorded');
 expect((await academy.admin.from('payments').select('id',{count:'exact'}).eq('monthly_charge_id',charge.data!.id)).count).toBe(1);
 await page.goto('/payments/partial?student='+academy.studentId);await expect(page.getByRole('row').filter({hasText:'E2E Assigned '+academy.suffix})).toContainText('40.25');
 await page.goto('/payments/full?student='+academy.studentId);await expect(page.getByText('No payment records found.')).toBeVisible();
 await page.goto('/payments/new');await page.getByLabel('Outstanding charge').selectOption(charge.data!.id);await expect(page.getByLabel('Amount')).toHaveValue('60.25');await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect(page.getByRole('status')).toContainText('Payment recorded');
 await page.goto('/payments/full?student='+academy.studentId);await expect(page.getByRole('row').filter({hasText:'E2E Assigned '+academy.suffix})).toHaveCount(2);await expect(page.locator('.metrics').getByText(/100\.50/)).toBeVisible();await page.reload();await expect(page.locator('.metrics').getByText(/100\.50/)).toBeVisible();
});
