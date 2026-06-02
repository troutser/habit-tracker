import { useState, useEffect, useCallback, useRef } from "react";
import { Store  } from "@tauri-apps/plugin-store";
import { readFile } from "@tauri-apps/plugin-fs";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import "./App.css";

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const DEFAULT_THEME = {
	fontFamily: "JetBrains Mono",
	fontSize: 13,
	bgColor: "#1e1e1c",
	bgImage: null,
	bgOpacity: 0.7,
	textColor: "#e8e8e4",
	accentColor: "#639922",
	widgetOpacity: 1,
	borderRadius: 12,
	animationStyle: "pop",
	animationIntensity: 1,
	soundVolume: 0.5,
};

const FONT_OPTIONS = [
	"JetBrains Mono",
	"Inter",
	"Roboto",
	"Open Sans",
	"Playfair Display",
	"Montserrat",
	"Fira Code",
	"Comic Neue",
	"Bangers",
	"Dancing Script",
	"Pacifico",
	"system-ui",
	"monospace",
	"serif",
	"sans-serif",
	"Georgia",
	"Courier New",
	"Trebuchet MS",
	"Verdana",
	"Arial",
];

const ANIMATION_OPTIONS = ["pop", "slide", "bounce", "none"];

function calcStreak(completedDays, todayStr) {
	if (!completedDays.length) return 0;
	const sorted = [...completedDays].sort().reverse();
	let streak = 0;
	const cursor = new Date(todayStr);
	for (const d of sorted) {
		const expected = cursor.toISOString().slice(0, 10);
		if (d === expected) {
			streak++;
			cursor.setDate(cursor.getDate() - 1);
		} else break;
	}
	return streak;
}

function formatDate(dateStr) {
	return new Date(dateStr).toLocaleDateString("en-US", {
		weekday: "long", month: "short", day: "numeric",
	}).toLowerCase();
}

export default function App() {
	const [habits, setHabits] = useState([]);
	const [store, setStore] = useState(null);
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState("");
	const [pinned, setPinned] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [theme, setTheme] = useState(DEFAULT_THEME);
	const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
	const [animDropdownOpen, setAnimDropdownOpen] = useState(false);
	const rootRef = useRef(null);
	const fontDropdownRef = useRef(null);
	const animDropdownRef = useRef(null);
	const appWindowRef = useRef(null);
	const prevSizeRef = useRef(null);
	const restoringRef = useRef(false);
	const [todayStr, setTodayStr] = useState(getTodayStr());

	useEffect(() => {
		const interval = setInterval(() => {
			const now = getTodayStr();
			if (now !== todayStr) setTodayStr(now);
		}, 60000); // Check every minute
		return () => clearInterval(interval);
	}, [todayStr]);

	useEffect(() => {
		appWindowRef.current = getCurrentWindow();
	}, []);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target)) {
				setFontDropdownOpen(false);
			}
			if (animDropdownRef.current && !animDropdownRef.current.contains(e.target)) {
				setAnimDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		async function init() {
			const s = await Store.load("habits.json", { autoSave: true });
			setStore(s);
			const savedHabits = await s.get("habits");
			if (savedHabits) setHabits(savedHabits);
			const savedTheme = await s.get("theme");
			if (savedTheme) setTheme({ ...DEFAULT_THEME, ...savedTheme });
			const savedPinned = await s.get("pinned");
			if (savedPinned !== null && savedPinned !== undefined) {
				setPinned(savedPinned);
			}
		}
		init();
	}, []);

	useEffect(() => {
		if (!rootRef.current) return;

		let timeout;
		const resizeWindow = async () => {
			if (!rootRef.current || !appWindowRef.current || restoringRef.current) return;
			const rect = rootRef.current.getBoundingClientRect();
			const reqW = Math.ceil(rect.width);
			const reqH = Math.ceil(rect.height);
			
			if (!Number.isFinite(reqW) || !Number.isFinite(reqH)) return;
			if (reqW <= 0 || reqH <= 0) return;

			const current = await appWindowRef.current.innerSize();
			const factor = await appWindowRef.current.scaleFactor();
			const curW = Math.ceil(current.width / factor);
			const curH = Math.ceil(current.height / factor);

			let nextW = curW;
			let nextH = curH;

			if (showSettings) {
				// Snug fit height, but keep current width (unless content is wider)
				nextH = reqH;
				if (reqW > curW) nextW = reqW;
			} else {
				// Respect user choice but prevent clipping
				if (reqW > curW) nextW = reqW;
				if (reqH > curH) nextH = reqH;
			}

			if (Math.abs(nextW - curW) > 1 || Math.abs(nextH - curH) > 1) {
				await appWindowRef.current.setSize(new LogicalSize(nextW, nextH));
			}
		};

		const observer = new ResizeObserver(() => {
			clearTimeout(timeout);
			timeout = setTimeout(resizeWindow, 10);
		});

		observer.observe(rootRef.current);
		resizeWindow();
		return () => { observer.disconnect(); clearTimeout(timeout); };
	}, [showSettings]);	

	useEffect(() => {
		appWindowRef.current?.setAlwaysOnTop(pinned);
	}, [pinned]);

	const saveHabits = useCallback(async (updated) => {
		setHabits(updated);
		if (store) await store.set("habits", updated);
	}, [store]);

	const saveTheme = useCallback(async (updated) => {
		setTheme(updated);
		if (store) await store.set("theme", updated);
	}, [store]);

	async function togglePin() {
		const next = !pinned;
		setPinned(next);
		await appWindowRef.current.setAlwaysOnTop(next);
		if (store) await store.set("pinned", next);
	}

	async function toggleSettings() {
		const next = !showSettings;
		if (next) {
			const current = await appWindowRef.current.innerSize();
			const factor = await appWindowRef.current.scaleFactor();
			prevSizeRef.current = {
				width: Math.ceil(current.width / factor),
				height: Math.ceil(current.height / factor),
			};
		} else {
			const prev = prevSizeRef.current;
			if (prev) {
				restoringRef.current = true;
				await appWindowRef.current.setSize(new LogicalSize(prev.width, prev.height));
				setTimeout(() => { restoringRef.current = false; }, 250);
			}
		}
		setShowSettings(next);
		setAdding(false);
	}	

	function toggleToday(idx) {
		const updated = habits.map((h, i) => {
			if (i !== idx) return h;
			const done = h.completedDays.includes(todayStr);

			// Play a subtle sound effect using Web Audio API
			const playSound = async () => {
				try {
					const AudioContextClass = window.AudioContext || window.webkitAudioContext;
					if (!AudioContextClass) return;
					const context = new AudioContextClass();
					if (context.state === "suspended") await context.resume();
					
					const oscillator = context.createOscillator();
					const gain = context.createGain();
					
					oscillator.connect(gain);
					gain.connect(context.destination);
					
					oscillator.type = "sine";
					// Higher pitch for checking off, lower for unchecking
					oscillator.frequency.setValueAtTime(done ? 400 : 800, context.currentTime);
					
					const volume = theme.soundVolume ?? 0.5;
					gain.gain.setValueAtTime(0, context.currentTime);
					gain.gain.linearRampToValueAtTime(volume * 0.6, context.currentTime + 0.01);
					gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
					
					oscillator.start();
					oscillator.stop(context.currentTime + 0.2);
					
					// Cleanup context after sound finishes
					setTimeout(() => context.close(), 300);
				} catch (e) {
					console.error("Audio error:", e);
				}
			};
			playSound();

			return {
				...h,
				completedDays: done
				? h.completedDays.filter((d) => d !== todayStr)
				: [...h.completedDays, todayStr],
			};
		});
		saveHabits(updated);
	}

	function deleteHabit(idx) {
		saveHabits(habits.filter((_, i) => i !== idx));
	}

	function addHabit() {
		const name = newName.trim();
		if (!name) return;
		saveHabits([...habits, { name, completedDays: [] }]);
		setNewName("");
		setAdding(false);
	}

	async function pickBgImage() {
		const selected = await openDialog({
			filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
		});
		if (!selected) return;

		const bytes = await readFile(selected);
		const ext = selected.split(".").pop().toLowerCase();
		const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
			: ext === "png" ? "image/png"
			: ext === "webp" ? "image/webp"
			: "image/gif";
		const base64 = btoa(String.fromCharCode(...bytes));
		saveTheme({ ...theme, bgImage: `data:${mime};base64,${base64}` });
	}

	async function pickHabitImage(idx) {
		const selected = await openDialog({
			filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
		});
		if (!selected) return;

		const bytes = await readFile(selected);
		const ext = selected.split(".").pop().toLowerCase();
		const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
			: ext === "png" ? "image/png"
			: ext === "webp" ? "image/webp"
			: "image/gif";
		const base64 = btoa(String.fromCharCode(...bytes));
		const updated = [...habits];
		updated[idx] = { ...updated[idx], image: `data:${mime};base64,${base64}` };
		saveHabits(updated);
	}

	function clearHabitImage(idx) {
		const updated = [...habits];
		updated[idx] = { ...updated[idx], image: null };
		saveHabits(updated);
	}

	function clearBgImage() {
		saveTheme({ ...theme, bgImage: null });
	}

	function stop(e) {
		e.stopPropagation();
	}

	const cssVars = {
		"--font": theme.fontFamily,
		"--font-size": `${theme.fontSize}px`,
		"--bg-color": theme.bgColor,
		"--text-color": theme.textColor,
		"--accent": theme.accentColor,
		"--widget-opacity": theme.widgetOpacity,
		"--border-radius": `${theme.borderRadius}px`,
		"--bg-opacity": theme.bgOpacity,
		"--anim-intensity": theme.animationIntensity ?? 1,
	};

	const accentBg = theme.accentColor + "22";
	const allDone = habits.length > 0 && habits.every(h => h.completedDays.includes(todayStr));

	return (
		<div
		className={`widget${allDone ? " celebration" : ""}`}
		style={cssVars}
		{...(!pinned && {"data-tauri-drag-region": true})}
		>
		{allDone && (
			<div className="confetti-container">
				{[...Array(16)].map((_, i) => (
					<div key={i} className={`confetti piece-${i}`} />
				))}
			</div>
		)}
		{theme.bgImage && (
			<div
			className="bg-image"
			style={{
				backgroundImage: `url("${theme.bgImage}")`,
					opacity: theme.bgOpacity,
			}}
			/>
		)}

		<div className="widget-inner">
			<div 
				ref={rootRef} 
				className="widget-content"
				style={{ minHeight: showSettings ? "unset" : "100%" }}
			>
		<div className="header" {...(!pinned ? { "data-tauri-drag-region": true } : {})}>
		<div {...(!pinned ? { "data-tauri-drag-region": true } : {})}>
		<div className="title" {...(!pinned ? { "data-tauri-drag-region": true } : {})}></div>
		<div className="date" {...(!pinned ? { "data-tauri-drag-region": true } : {})}>{formatDate(todayStr)}</div>
		</div>
		<div className="header-btns" onMouseDown={stop}>
		<button
		className={`icon-btn${pinned ? " active" : ""}`}
		onClick={togglePin}
		title={pinned ? "Unpin window" : "Pin window (always on top)"}
		>*</button>
		<button
		className={`icon-btn${showSettings ? " active" : ""}`}
		onClick={(e) => { e.stopPropagation(); toggleSettings(); }}
		title="Customize"
		>&</button>
		<button
		className="icon-btn"
		onClick={() => { setAdding(v => !v); setShowSettings(false); }}
		title="Add habit"
		>{adding ? "x" : "+"}</button>
		</div>
		</div>

		{showSettings && (
			<div className="settings" onMouseDown={stop}>
			<div className="settings-title">customize</div>

			<label>font</label>
			<div className="dropdown-container" ref={fontDropdownRef}>
			<div className="dropdown-trigger" onClick={() => setFontDropdownOpen(!fontDropdownOpen)}>
			<span>{theme.fontFamily}</span>
			<span className="arrow">{fontDropdownOpen ? "▲" : "▼"}</span>
			</div>
			{fontDropdownOpen && (
				<div className="dropdown-menu">
				{FONT_OPTIONS.map((f) => (
					<div key={f} className={`dropdown-item ${theme.fontFamily === f ? "selected" : ""}`}
					style={{ fontFamily: f }}
					onClick={() => { saveTheme({ ...theme, fontFamily: f }); setFontDropdownOpen(false); }}>
					{f}
					</div>
				))}
				</div>
			)}
			</div>


			<label>font size</label>
			<div className="row">
			<input type="range" min="1" max="100" value={theme.fontSize}
			onChange={e => saveTheme({ ...theme, fontSize: Number(e.target.value) })} />
			<span>{theme.fontSize}px</span>
			</div>

			<label>background color</label>
			<div className="row">
			<input type="color" value={theme.bgColor}
			onChange={e => saveTheme({ ...theme, bgColor: e.target.value })} />
			<span>{theme.bgColor}</span>
			</div>

			<label>background image</label>
			<div className="row">
			<button className="small-btn" onClick={pickBgImage}>choose file</button>
			{theme.bgImage && (
				<button className="small-btn danger" onClick={clearBgImage}>clear</button>
			)}
			</div>

			{theme.bgImage && (
				<>
				<label>image opacity</label>
				<div className="row">
				<input type="range" min="0" max="1" step="0.05" value={theme.bgOpacity}
				onChange={e => saveTheme({ ...theme, bgOpacity: Number(e.target.value) })} />
				<span>{Math.round(theme.bgOpacity * 100)}%</span>
				</div>
				</>
			)}

			<label>text color</label>
			<div className="row">
			<input type="color" value={theme.textColor}
			onChange={e => saveTheme({ ...theme, textColor: e.target.value })} />
			<span>{theme.textColor}</span>
			</div>

			<label>accent color</label>
			<div className="row">
			<input type="color" value={theme.accentColor}
			onChange={e => saveTheme({ ...theme, accentColor: e.target.value })} />
			<span>{theme.accentColor}</span>
			</div>

			<label>widget opacity</label>
			<div className="row">
			<input type="range" min="0.2" max="1" step="0.05" value={theme.widgetOpacity}
			onChange={e => saveTheme({ ...theme, widgetOpacity: Number(e.target.value) })} />
			<span>{Math.round(theme.widgetOpacity * 100)}%</span>
			</div>

			<label>corner radius</label>
			<div className="row">
			<input type="range" min="0" max="24" value={theme.borderRadius}
			onChange={e => saveTheme({ ...theme, borderRadius: Number(e.target.value) })} />
			<span>{theme.borderRadius}px</span>
			</div>

			<label>animation style</label>
			<div className="dropdown-container" ref={animDropdownRef}>
				<div className="dropdown-trigger" onClick={() => setAnimDropdownOpen(!animDropdownOpen)}>
					<span>{theme.animationStyle || "pop"}</span>
					<span className="arrow">{animDropdownOpen ? "▲" : "▼"}</span>
				</div>
				{animDropdownOpen && (
					<div className="dropdown-menu">
						{ANIMATION_OPTIONS.map((opt) => (
							<div key={opt} className={`dropdown-item ${theme.animationStyle === opt ? "selected" : ""}`}
							onClick={() => { saveTheme({ ...theme, animationStyle: opt }); setAnimDropdownOpen(false); }}>
							{opt}
							</div>
						))}
					</div>
				)}
			</div>

			<label>animation intensity</label>
			<div className="row">
				<input type="range" min="0.5" max="2.5" step="0.1" value={theme.animationIntensity ?? 1}
				onChange={e => saveTheme({ ...theme, animationIntensity: Number(e.target.value) })} />
				<span>{theme.animationIntensity ?? 1}x</span>
			</div>

			<label>sound volume</label>
			<div className="row">
				<input type="range" min="0" max="1" step="0.05" value={theme.soundVolume ?? 0.5}
				onChange={e => saveTheme({ ...theme, soundVolume: Number(e.target.value) })} />
				<span>{Math.round((theme.soundVolume ?? 0.5) * 100)}%</span>
			</div>

			<button className="small-btn" style={{ marginTop: 8 }}
			onClick={() => saveTheme(DEFAULT_THEME)}>reset to default</button>

			<div className="settings-divider" style={{ margin: "12px 0 8px" }} />
			<div className="settings-title">habit images</div>
			<div className="habit-image-settings">
				{habits.map((habit, idx) => (
					<div key={idx} className="habit-image-row">
						<span className="habit-image-name">{habit.name}</span>
						<div className="habit-image-btns">
							<button className="small-btn" onClick={() => pickHabitImage(idx)}>
								{habit.image ? "change" : "choose"}
							</button>
							{habit.image && (
								<button className="small-btn danger" onClick={() => clearHabitImage(idx)}>x</button>
							)}
						</div>
					</div>
				))}
				{habits.length === 0 && <div className="empty" style={{ padding: 0 }}>no habits to customize</div>}
			</div>
			</div>
		)}

		{!showSettings && (
			<div className="habits">
			{habits.length === 0 && !adding && (
				<div className="empty">add a habit? :))</div>
	)}
			{habits.map((habit, idx) => {
				const done = habit.completedDays.includes(todayStr);
				const streak = calcStreak(habit.completedDays, todayStr);
				return (
					<div
					key={idx}
					className={`habit${done ? ` done anim-${theme.animationStyle || 'pop'}` : ""}`}
					style={done ? { background: accentBg, borderColor: theme.accentColor } : {}}
					onMouseDown={stop}
					onClick={() => toggleToday(idx)}
					>
					{habit.image && (
						<div 
							className="habit-icon-img" 
							style={{ backgroundImage: `url("${habit.image}")` }}
						/>
					)}
					{!habit.image && (
						<div className="check"
						style={done ? { background: theme.accentColor, borderColor: theme.accentColor } : {}}>
						{done ? "✓" : ""}
						</div>
					)}
					<div className="habit-name">{habit.name}</div>
					<div className="streak" style={done ? { color: theme.accentColor } : {}}>
					<span className="streak-num" style={done ? { color: theme.accentColor } : {}}>{streak}</span>
					<span>d</span>
					</div>
					<button
					className="delete-btn"
					onMouseDown={stop}
					onClick={(e) => { e.stopPropagation(); deleteHabit(idx); }}
					title="Remove"
					>×</button>
					</div>
				);
			})}
			</div>
		)}

		{adding && (
			<div className="add-form" onMouseDown={stop}>
			<input
			autoFocus
			type="text"
			value={newName}
			onChange={(e) => setNewName(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") addHabit();
				if (e.key === "Escape") { setAdding(false); setNewName(""); }
			}}
			placeholder="new habit..."
			maxLength={32}
			/>
			<button className="confirm-btn" onClick={addHabit}>add</button>
			</div>
		)}
			</div>

		{["North","South","East","West","NorthEast","NorthWest","SouthEast","SouthWest"].map(dir => (
			<div
			key={dir}
			className={`resize-handle resize-${dir.toLowerCase()}`}
			onMouseDown={e => {
				e.stopPropagation();
				appWindowRef.current?.startResizeDragging(dir);
			}}
			/>
		))}
		</div>
		</div>
	);
}


