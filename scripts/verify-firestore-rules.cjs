// Only a local demo emulator; no credentials, operating records or deployed rules.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
// Use the same SDK instance as the test environment when test dependencies are isolated.
const testRequire = createRequire(require.resolve('@firebase/rules-unit-testing'));
const { doc, getDoc, setDoc, deleteDoc, collection, getDocs } = testRequire('firebase/firestore');
const projectId = 'demo-sunlab-photo-security';

(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8089') {
    throw new Error('Run only with the isolated 127.0.0.1:8089 emulator.');
  }
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../firebase/firestore.proposed.rules'), 'utf8') },
  });
  let checks = 0;
  try {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'students/fixture'), { name: 'Synthetic fixture' });
      await setDoc(doc(context.firestore(), 'presentations/fixture/slides/fixture'), { title: 'Synthetic fixture' });
    });
    const teacherUid = 'fNhzgdP9sLdhgqbVmJnNpZDiOfw1';
    const denied = [
      env.unauthenticatedContext(),
      env.authenticatedContext('student-fixture', { firebase: { sign_in_provider: 'custom' } }),
      env.authenticatedContext('other-teacher', { firebase: { sign_in_provider: 'password' } }),
      env.authenticatedContext(teacherUid, { firebase: { sign_in_provider: 'custom' } }),
    ];
    for (const context of denied) {
      const db = context.firestore();
      await assertFails(getDoc(doc(db, 'students/fixture'))); checks++;
      await assertFails(getDocs(collection(db, 'students'))); checks++;
      await assertFails(setDoc(doc(db, 'students/fixture'), { name: 'Tamper' })); checks++;
      await assertFails(deleteDoc(doc(db, 'students/fixture'))); checks++;
    }
    const teacher = env.authenticatedContext(teacherUid, { firebase: { sign_in_provider: 'password' } }).firestore();
    await assertSucceeds(getDoc(doc(teacher, 'students/fixture'))); checks++;
    await assertSucceeds(getDocs(collection(teacher, 'students'))); checks++;
    await assertSucceeds(setDoc(doc(teacher, 'students/new-fixture'), { name: 'Synthetic teacher fixture' })); checks++;
    await assertSucceeds(getDoc(doc(teacher, 'presentations/fixture/slides/fixture'))); checks++;
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'presentations/fixture/slides/fixture'))); checks++;
    await assertFails(setDoc(doc(teacher, 'unlisted/fixture'), { value: true })); checks++;
    await assertFails(getDoc(doc(teacher, 'students/fixture/private/fixture'))); checks++;
    console.log(`PASS: ${checks} Firestore draft-rule checks; emulator only, no deployment.`);
  } finally {
    await env.cleanup();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
