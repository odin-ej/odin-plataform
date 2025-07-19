import Image from "next/image";
import Link from "next/link";

const HeaderND = () => {
  return (
    <header className='w-full'>
      <div className=" flex items-center py-6 justify-around gap-4 md:gap-8 border-b-2 border-white">
        <div>
          <Image src="/Logo.png" alt="Logo" width={120} height={120} />
        </div>
        <div>
          <nav>
            <ul className="flex gap-4 text-white font-semibold">
              <li>
                <Link
                  className="hover:underline"
                  href="https://www.empresajr.org"
                >
                  Institucional
                </Link>
              </li>
              <li>
                <Link
                  className="hover:underline"
                  href="https://www.empresajr.org/blog/"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default HeaderND;
