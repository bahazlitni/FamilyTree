import React from 'react'
import {
   MdEmail,
   MdSend,
   MdOutlineQuestionMark,
   MdOutlineMaximize,
   MdOutlineMinimize,
   MdClose,
} from 'react-icons/md'
import {
   FaCheckCircle,
   FaCircle,
   FaEdit,
   FaGoogle,
   FaDiscord,
   FaEye,
   FaEyeSlash,
   FaFileDownload,
   FaLinkedin,
   FaWindows,
   FaGithub,
   FaArrowUp,
   FaChevronRight,
   FaChevronLeft,
   FaInstagram,
   FaApple,
   FaLinux,
   FaAndroid,
   FaExternalLinkAlt,
} from 'react-icons/fa'

type IconProps = { name: string } & React.ComponentProps<typeof MdEmail>

export default function Icon({ name, ...props }: IconProps) {
   switch (name) {
      case 'close':
         return <MdClose {...props} />
      case 'instagram':
         return <FaInstagram {...props} />
      case 'email':
         return <MdEmail {...props} />
      case 'linkedin':
         return <FaLinkedin {...props} />
      case 'github':
         return <FaGithub {...props} />
      case 'discord':
         return <FaDiscord {...props} />
      case 'google':
         return <FaGoogle {...props} />
      case 'arrow-up':
         return <FaArrowUp {...props} />
      case 'send':
         return <MdSend {...props} />
      case 'chevron-right':
         return <FaChevronRight {...props} />
      case 'chevron-left':
         return <FaChevronLeft {...props} />
      case 'maximize':
         return <MdOutlineMaximize {...props} />
      case 'minimize':
         return <MdOutlineMinimize {...props} />
      case 'windows':
         return <FaWindows {...props} />
      case 'mac-os':
      case 'ios':
         return <FaApple {...props} />
      case 'linux':
         return <FaLinux {...props} />
      case 'android':
         return <FaAndroid {...props} />
      case 'external-link':
         return <FaExternalLinkAlt {...props} />
      case 'download':
         return <FaFileDownload {...props} />
      case 'eye':
         return <FaEye {...props} />
      case 'eye-shut':
         return <FaEyeSlash {...props} />
      case 'edit':
         return <FaEdit {...props} />
      case 'checked-box':
         return <FaCheckCircle {...props} />
      case 'unchecked-box':
         return <FaCircle {...props} />
      default:
         return <MdOutlineQuestionMark {...props} />
   }
}
