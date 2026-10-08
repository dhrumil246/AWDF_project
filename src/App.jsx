import Header from './components/Header';
import About from './components/About';
import Skills from './components/Skills';
import Footer from './components/Footer';
import NavBar from './components/NavBar';
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
];

const skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'];

function App() {
  return (
    <>
      <Header name={profile.name} role={profile.role} themeColor="#4f46e5" />
      <NavBar links={navLinks} />
      <main className="container">
        <About bio={profile.bio} />
        <Skills skillList={skills} />
      </main>
      <Footer name={profile.name} email={profile.email} />
    </>
  );
}

export default App;
