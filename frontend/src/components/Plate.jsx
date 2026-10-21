// An Indian registration plate: "GJ01AB1234" is shown as "GJ 01 AB 1234".
function formatPlate(reg) {
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(reg);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : reg;
}

function Plate({ number }) {
  return (
    <span className="plate" aria-label={`Registration ${number}`}>
      <span className="plate-ind" aria-hidden="true">
        IND
      </span>
      {formatPlate(number)}
    </span>
  );
}

export default Plate;
