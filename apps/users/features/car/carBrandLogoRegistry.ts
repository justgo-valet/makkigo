const carBrandLogoRegistry = [
  { id: "astonmartin", name: "애스턴마틴", logoSrc: "/images/astonmartin.png" },
  { id: "audi", name: "아우디", logoSrc: "/images/audi.png" },
  { id: "benz", name: "벤츠", logoSrc: "/images/benz.png" },
  { id: "bentley", name: "벤틀리", logoSrc: "/images/bentley.png" },
  { id: "bmw", name: "BMW", logoSrc: "/images/bmw.png" },
  { id: "byd", name: "BYD", logoSrc: "/images/byd.png" },
  { id: "cadillac", name: "캐딜락", logoSrc: "/images/cadillac.png" },
  { id: "chevrolet", name: "쉐보레", logoSrc: "/images/chevrolet.png" },
  { id: "ferrari", name: "페라리", logoSrc: "/images/ferrari.png" },
  { id: "ford", name: "포드", logoSrc: "/images/ford.png" },
  { id: "genesis", name: "제네시스", logoSrc: "/images/genesis.png" },
  { id: "gmc", name: "GMC", logoSrc: "/images/gmc.png" },
  { id: "honda", name: "혼다", logoSrc: "/images/honda.png" },
  { id: "hyundai", name: "현대", logoSrc: "/images/hyundai.png" },
  { id: "jeep", name: "지프", logoSrc: "/images/jeep.png" },
  { id: "kgm", name: "KGM", logoSrc: "/images/kgm.png" },
  { id: "kia", name: "기아", logoSrc: "/images/kia.png" },
  { id: "lamborghini", name: "람보르기니", logoSrc: "/images/lamborghini.png" },
  { id: "landrover", name: "랜드로버", logoSrc: "/images/landrover.png" },
  { id: "lexus", name: "렉서스", logoSrc: "/images/lexus.png" },
  { id: "lincoln", name: "링컨", logoSrc: "/images/lincoln.png" },
  { id: "lotus", name: "로터스", logoSrc: "/images/lotus.png" },
  { id: "maserati", name: "마세라티", logoSrc: "/images/maserati.png" },
  { id: "mclaren", name: "맥라렌", logoSrc: "/images/mclaren.png" },
  { id: "mini", name: "미니", logoSrc: "/images/mini.png" },
  { id: "peugeot", name: "푸조", logoSrc: "/images/peugeot.png" },
  { id: "polestar", name: "폴스타", logoSrc: "/images/polestar.png" },
  { id: "porsche", name: "포르쉐", logoSrc: "/images/porsche.png" },
  { id: "renaultkorea", name: "르노코리아", logoSrc: "/images/renaultkorea.png" },
  { id: "rollsroyce", name: "롤스로이스", logoSrc: "/images/rollsroyce.png" },
  { id: "tesla", name: "테슬라", logoSrc: "/images/tesla.png" },
  { id: "toyota", name: "토요타", logoSrc: "/images/toyota.png" },
  { id: "volkswagen", name: "폭스바겐", logoSrc: "/images/volkswagen.png" },
  { id: "volvo", name: "볼보", logoSrc: "/images/volvo.png" },
  { id: "zeekr", name: "지커", logoSrc: "/images/zeekr.png" },
] as const;

type CarBrand = (typeof carBrandLogoRegistry)[number];
type CarBrandId = CarBrand["id"];

export { carBrandLogoRegistry };
export type { CarBrand, CarBrandId };
