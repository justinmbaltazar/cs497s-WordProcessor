import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Login() {
	const [username, setUsername]: [username: string | undefined, setUsername: (arg: any) => void] = useState<string | undefined>('');
	const [question, setQuestion]: [username: string | undefined, setUsername: (arg: any) => void] = useState<string | undefined>('');
	const [password, setPassword]: [username: string | undefined, setPassword: (arg: any) => void] = useState<string | undefined>('');



	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		console.log(username);
		console.log(password);
		e.preventDefault();
		await axios.post('http://localhost:4003/login', {
			username,
			password
		});
	};

	return (<div>
			<h1>Log In</h1>
			<form onSubmit={handleSubmit}>
				<label>Question</label>
				<input type="text" onChange={e => setUsername(e.target.value)} value={username} />
				<label>Password</label>
				<input type="password" onChange={e => setPassword(e.target.value)} value={password} />
				<div><button type="submit">Submit</button></div>
			</form>
		</div>
	);
}