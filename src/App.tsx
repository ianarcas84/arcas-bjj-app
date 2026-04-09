import { useEffect, useState } from "react";
import "./App.css";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";

// FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDeuTRVzzoEv7wE5KAaRHs8aZtO54QAo_k",
  authDomain: "arcas-bjj-app.firebaseapp.com",
  projectId: "arcas-bjj-app",
  storageBucket: "arcas-bjj-app.firebasestorage.app",
  messagingSenderId: "72402274701",
  appId: "1:72402274701:web:f5fac037d8b89c4edc55c4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const logo = "https://i.imgur.com/dOKGTE9.jpeg";

// FAIXAS
const adultBelts = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

const childBelts = [
  "Branca",
  "Cinza/Branca","Cinza","Cinza/Preta",
  "Amarela/Branca","Amarela","Amarela/Preta",
  "Laranja/Branca","Laranja","Laranja/Preta",
  "Verde/Branca","Verde","Verde/Preta"
];

type ClassRecord = {
  date: string;
  technique: number;
  behavior: number;
  performance: number;
};

type HistoryRecord = {
  date: string;
  type: "belt" | "degree";
  value: string;
};

type Student = {
  id: string;
  name: string;
  belt: string;
  degree: number;
  category: "adult" | "child";
  classes: ClassRecord[];
  history: HistoryRecord[];
};

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [category, setCategory] = useState<"adult" | "child" | null>(null);
  const [name, setName] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const vibrate = () => navigator.vibrate?.(30);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Student, "id">),
      classes: doc.data().classes || [],
      history: doc.data().history || []
    }));
    setStudents(data);
  };

  const updateLocal = (updated: Student) => {
    setSelectedStudent(updated);
    setStudents((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  // MÉDIA
  const getAverage = (s: Student) => {
    if (!s.classes.length) return 0;
    const total = s.classes.reduce(
      (acc, c) => acc + c.technique + c.behavior + c.performance,
      0
    );
    return total / (s.classes.length * 3);
  };

  // PRÓXIMA FAIXA
  const getNextBelt = (s: Student) => {
    const belts = s.category === "adult" ? adultBelts : childBelts;
    const index = belts.indexOf(s.belt);
    return belts[index + 1] || "Final";
  };

  // REGRA GRADUAÇÃO
  const isReady = (s: Student) => {
    const avg = getAverage(s);
    const classes = s.classes.length;

    const months = classes / 12; // base 3x semana
    const timeOk = months >= (s.degree + 1) * 4;

    return avg >= 3.5 && classes >= 10 && timeOk;
  };

  // PROMOVER
  const promote = async (s: Student) => {
    if (!window.confirm("Promover aluno?")) return;

    let newBelt = s.belt;
    let newDegree = s.degree + 1;

    if (newDegree > 4) {
      newDegree = 0;
      newBelt = getNextBelt(s);
    }

    const history = [
      ...s.history,
      { date: today, type: "belt", value: newBelt },
      { date: today, type: "degree", value: String(newDegree) }
    ];

    await updateDoc(doc(db, "students", s.id), {
      belt: newBelt,
      degree: newDegree,
      history
    });

    updateLocal({ ...s, belt: newBelt, degree: newDegree, history });
  };

  // ADD
  const addStudent = async () => {
    if (!name || !category) return;

    await addDoc(collection(db, "students"), {
      name,
      belt: "Branca",
      degree: 0,
      category,
      classes: [],
      history: []
    });

    setName("");
    loadStudents();
  };

  // DELETE
  const deleteStudent = async (s: Student) => {
    if (!window.confirm("Excluir aluno?")) return;
    await deleteDoc(doc(db, "students", s.id));
    setSelectedStudent(null);
    loadStudents();
  };

  // GRAU
  const updateDegree = async (s: Student, value: number) => {
    vibrate();
    const degree = s.degree === value ? 0 : value;

    const history = [
      ...s.history,
      { date: today, type: "degree", value: String(degree) }
    ];

    await updateDoc(doc(db, "students", s.id), { degree, history });
    updateLocal({ ...s, degree, history });
  };

  // FAIXA
  const updateBelt = async (s: Student, belt: string) => {
    const history = [
      ...s.history,
      { date: today, type: "belt", value: belt }
    ];

    await updateDoc(doc(db, "students", s.id), { belt, history });
    updateLocal({ ...s, belt, history });
  };

  // AULA
  const addClass = async (s: Student) => {
    const newClass = {
      date: today,
      technique: 0,
      behavior: 0,
      performance: 0
    };

    const classes = [...s.classes, newClass];

    await updateDoc(doc(db, "students", s.id), { classes });
    updateLocal({ ...s, classes });
  };

  // NOTA
  const updateClass = async (s: Student, i: number, field: any, value: number) => {
    vibrate();

    const classes = [...s.classes];
    classes[i][field] = value;

    updateLocal({ ...s, classes });
    await updateDoc(doc(db, "students", s.id), { classes });
  };

  const Star = ({ value, onChange }: any) => (
    <div>
      {[1,2,3,4,5].map(n=>(
        <span key={n} onClick={()=>onChange(n)} style={{
          color:n<=value?"gold":"#444",fontSize:22,cursor:"pointer"
        }}>★</span>
      ))}
    </div>
  );

  const Header = () => (
    <div style={{textAlign:"center"}}>
      <img src={logo} style={{width:160}}/>
      <h1>ARCAS BJJ</h1>
    </div>
  );

  // HISTÓRICO
  if (selectedStudent && showHistory) {
    return (
      <div className="container">
        <Header />
        <button onClick={()=>setShowHistory(false)}>← Voltar</button>

        {selectedStudent.history.map((h,i)=>(
          <div key={i} className="card">
            <p>{h.date}</p>
            <p>{h.type==="belt"?"Faixa":"Grau"}</p>
            <p>{h.value}</p>

            <button onClick={async()=>{
              if(!window.confirm("Excluir?")) return;
              const history = selectedStudent.history.filter((_,idx)=>idx!==i);
              await updateDoc(doc(db,"students",selectedStudent.id),{history});
              updateLocal({...selectedStudent,history});
            }}>❌</button>
          </div>
        ))}
      </div>
    );
  }

  // DETALHE
  if (selectedStudent) {
    const s = selectedStudent;
    const belts = s.category==="adult"?adultBelts:childBelts;

    return (
      <div className="container">
        <Header />
        <button onClick={()=>setSelectedStudent(null)}>← Voltar</button>

        <h2>{s.name}</h2>

        {isReady(s) && <p style={{color:"gold"}}>🔥 PRONTO PARA GRADUAÇÃO</p>}

        <button onClick={()=>deleteStudent(s)}>❌</button>

        <select value={s.belt} onChange={e=>updateBelt(s,e.target.value)}>
          {belts.map(b=><option key={b}>{b}</option>)}
        </select>

        <p>Grau:</p>
        {[1,2,3,4].map(n=>(
          <span key={n} onClick={()=>updateDegree(s,n)}
          style={{
            width:40,height:10,margin:5,display:"inline-block",
            background:n<=s.degree?"gold":"#333"
          }}/>
        ))}

        <button onClick={()=>setShowHistory(true)}>📜 Histórico</button>
        <button onClick={()=>addClass(s)}>+ Aula</button>

        {isReady(s) && (
          <button onClick={()=>promote(s)}>⬆ Promover</button>
        )}

        {s.classes.map((c,i)=>(
          <div key={i} className="card">
            <p>{c.date}</p>

            <p>Técnica</p>
            <Star value={c.technique} onChange={(v:number)=>updateClass(s,i,"technique",v)} />

            <p>Comportamento</p>
            <Star value={c.behavior} onChange={(v:number)=>updateClass(s,i,"behavior",v)} />

            <p>Performance</p>
            <Star value={c.performance} onChange={(v:number)=>updateClass(s,i,"performance",v)} />
          </div>
        ))}
      </div>
    );
  }

  // ESCOLHA
  if (!category) {
    return (
      <div className="container">
        <Header />
        <button onClick={()=>setCategory("child")}>👶 Crianças</button>
        <button onClick={()=>setCategory("adult")}>🥋 Adultos</button>
      </div>
    );
  }

  // LISTA
  return (
    <div className="container">
      <Header />
      <button onClick={()=>setCategory(null)}>← Voltar</button>

      <div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Novo aluno"/>
        <button onClick={addStudent}>Adicionar</button>
      </div>

      {students.filter(s=>s.category===category).map(s=>(
        <div key={s.id} className="card" onClick={()=>setSelectedStudent(s)}>
          <h3>{s.name}</h3>
          <p>{s.belt} • {s.degree}º Grau</p>
          <p>Aulas: {s.classes.length}</p>
          <p>Média: {getAverage(s).toFixed(1)}</p>
          {isReady(s) && <p>🔥 Pronto</p>}
        </div>
      ))}
    </div>
  );
}