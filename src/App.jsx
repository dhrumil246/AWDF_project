import Header from './components/Header';
import About from './components/About';
import Skills from './components/Skills';
import Footer from './components/Footer';
import NavBar from './components/NavBar';
import Projects from './components/Projects';
import './App.css';

const profile = {
  name: 'Dhrumil Amin',
  role: 'B.Tech IT Student · Full Stack Developer',
  email: 'dhrumil.work964@gmail.com',
  bio: 'I am a 5th semester B.Tech student who enjoys building web applications end to end, from React interfaces to Node.js APIs.',
};

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
];

const skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'];

const projects = [
  {
    title: 'Task Manager',
    description: 'Full stack task management app with authentication.',
    tech: 'React · Node.js · MongoDB',
  },
  {
    title: 'Weather Dashboard',
    description: 'Shows the current weather for any city using a public API.',
    tech: 'JavaScript · OpenWeather API',
  },
  {
    title: 'Library Management System',
    description: 'Tracks books, members and issue/return records.',
    tech: 'Java · MySQL',
  },
];

function App() {
  return (
    <>
      <Header name={profile.name} role={profile.role} themeColor="#4f46e5" />
      <NavBar links={navLinks} />
      <main className="container">
        <About bio={profile.bio} />
        <Skills skillList={skills} />
        <Projects projects={projects} />
      </main>
      <Footer name={profile.name} email={profile.email} />
    </>
  );
}

export default App;
