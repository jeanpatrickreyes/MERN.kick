import bcrypt from 'bcrypt';
import { db } from '../src/database/db';
import { collection, doc, setDoc, query, getDocs, where } from '../src/database/db';
import Tables from '../src/ultis/tables.ultis';
import { v4 as uuidv4 } from 'uuid';

async function addUser() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Usage: ts-node scripts/add-user.ts <email> <password> <role> [ageRange]');
        console.log('  role: "member" or "admin"');
        console.log('  ageRange: optional, only for members');
        process.exit(1);
    }

    const [email, password, role, ageRange] = args;

    if (!['member', 'admin'].includes(role)) {
        console.error('Error: role must be "member" or "admin"');
        process.exit(1);
    }

    try {
        // Check if user already exists
        const membersRef = collection(db, Tables.members);
        const q = query(membersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        const adminsRef = collection(db, Tables.admins);
        const qAdmin = query(adminsRef, where("email", "==", email));
        const querySnapshotAdmin = await getDocs(qAdmin);

        if (!querySnapshot.empty || !querySnapshotAdmin.empty) {
            console.error('Error: User with this email already exists');
            process.exit(1);
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const uid = uuidv4();

        if (role === 'member') {
            const newMember = {
                admin_id: null,
                email,
                ageRange: ageRange || null,
                password: hashedPassword,
                price: null,
                date: null,
                created_at: new Date().toISOString()
            };
            await setDoc(doc(db, Tables.members, uid), newMember);
            console.log(`✅ Member created successfully!`);
            console.log(`   ID: ${uid}`);
            console.log(`   Email: ${email}`);
        } else {
            const newAdmin = {
                admin_id: null,
                email,
                password: hashedPassword,
                role: 'admin',
                created_at: new Date().toISOString()
            };
            await setDoc(doc(db, Tables.admins, uid), newAdmin);
            console.log(`✅ Admin created successfully!`);
            console.log(`   ID: ${uid}`);
            console.log(`   Email: ${email}`);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
}

addUser();

