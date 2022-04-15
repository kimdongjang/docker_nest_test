import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  return (
    <ul>
      <li>
        <Link href="/">
          <a>Home</a>
        </Link>
      </li>
      <li>
        <Link href="/contact">
          <a>Contact Us</a>
        </Link>
      </li>
      <li>
        <Link href="/boards">
          <a>게시판</a>
        </Link>
      </li>
    </ul>
  )
}