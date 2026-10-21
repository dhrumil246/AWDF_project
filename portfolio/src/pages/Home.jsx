import About from '../components/About';
import Skills from '../components/Skills';

function Home({ bio, skills }) {
  return (
    <>
      <About bio={bio} />
      <Skills skillList={skills} />
    </>
  );
}

export default Home;
