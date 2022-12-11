import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Register() {
	const [username, setUsername]: [username: string | undefined, setUsername: (arg: any) => void] = useState<string | undefined>('');
    const [email, setEmail]: [email: string | undefined, setEmail: (arg: any) => void] = useState<string | undefined>('');
	const [password, setPassword]: [username: string | undefined, setPassword: (arg: any) => void] = useState<string | undefined>('');

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		await axios.post('http://localhost:4003/register', {
			username,
            email,
			password
		}, { withCredentials: true });
        /* setUsername(''), setPassword(''); */
	};

	return (
		<div>
			<h1>Register</h1>
			<form onSubmit={handleSubmit}>
				<label>Username</label>
				<input type="text" onChange={e => setUsername(e.target.value)} value={username} />
                <label>Email</label>
				<input type="text" onChange={e => setEmail(e.target.value)} value={email} />
				<label>Password</label>
				<input type="password" onChange={e => setPassword(e.target.value)} value={password} />
				<div><button type="submit">Submit</button></div>
			</form>
		</div>
	);
}