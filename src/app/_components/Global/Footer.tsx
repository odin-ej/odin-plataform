import Image from "next/image";
import Link from "next/link";
import MaxWidthWrapper from "./MaxWidthWrapper";

const Footer = () => {
  return (
    <footer className="w-full bg-[#141414]">
      <MaxWidthWrapper className='flex text-center items-center py-8 justify-around gap-4 md:gap-8 flex-col md:flex-row text-white'>
        <div>
          <Image
            src={"/Logo.png"}
            alt="Empresa Logo"
            width={100}
            height={100}
          />
        </div>
        <div>
          <h4>Empresa JR 2025©. Todos os Direitos Reservados.</h4>
        </div>
        <div>
          <nav>
            <ul className='flex gap-4'>
              <li>
                <Link href="https://www.empresajr.org">Institucional</Link>
              </li>
              <li>
                <Link href="https://www.empresajr.org/blog/">Blog</Link>
              </li>
            </ul>
          </nav>
        </div>
      </MaxWidthWrapper>
    </footer>
  );
};

export default Footer;
