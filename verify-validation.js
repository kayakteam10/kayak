async function testValidation() {
    try {
        // 1. Register a new user
        const rand = Date.now();
        const email = `test.user.${rand}@example.com`;
        const password = 'Password123!';

        console.log(`Registering user ${email}...`);
        const regRes = await fetch('http://localhost:8080/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                first_name: 'Test',
                last_name: 'User'
            })
        });
        const regData = await regRes.json();

        if (!regData.success) {
            // Try login if already exists (unlikely with random)
            throw new Error('Registration failed: ' + JSON.stringify(regData));
        }

        const token = regData.data.token;
        console.log('✅ Registration/Login successful');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Test Invalid Zip
        console.log('\nTesting Invalid Zip Code (123)...');
        const zipRes = await fetch('http://localhost:8080/auth/me', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ zipCode: '123' })
        });

        if (zipRes.status === 400) {
            console.log('✅ Passed: Rejected invalid zip (400)');
        } else {
            console.error(`❌ Failed: Status ${zipRes.status}`);
        }

        // 3. Test Invalid State
        console.log('\nTesting Invalid State (California)...');
        const stateRes = await fetch('http://localhost:8080/auth/me', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ state: 'California' })
        });

        if (stateRes.status === 400) {
            console.log('✅ Passed: Rejected invalid state (400)');
        } else {
            console.error(`❌ Failed: Status ${stateRes.status}`);
        }

        // 4. Test Valid Data
        console.log('\nTesting Valid Data...');
        const validRes = await fetch('http://localhost:8080/auth/me', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                zipCode: '90210',
                state: 'CA',
                city: 'Beverly Hills',
                address: '123 Valid St',
                phone: '555-555-5555',
                ssn: '123-45-6789'
            })
        });

        if (validRes.status === 200) {
            console.log('✅ Passed: Accepted valid data');
        } else {
            const data = await validRes.json();
            console.error(`❌ Failed: Status ${validRes.status} - ${JSON.stringify(data)}`);
        }

    } catch (error) {
        console.error('Test Suite Failed:', error.message);
    }
}

testValidation();
