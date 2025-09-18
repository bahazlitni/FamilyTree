// lib/Person.ts
import { cap, isNil } from '@/lib/utils'

export default class Person {
   public readonly id: string
   public readonly is_male: boolean | null
   public readonly firstname: string | null
   public readonly lastname: string | null
   public readonly is_alive: boolean | null
   public readonly birth_year: number | null
   public readonly birth_month: number | null
   public readonly birth_day: number | null
   public readonly death_year: number | null
   public readonly death_month: number | null
   public readonly death_day: number | null
   public readonly birth_place: string | null
   public readonly birth_country: string | null

   // precomputed
   public readonly fullname: string | null
   public readonly lifespan: string | null

   constructor(
      id: string,
      is_male: boolean | null = null,
      firstname: string | null = null,
      lastname: string | null = null,
      is_alive: boolean | null = null,
      birth_year: number | null = null,
      birth_month: number | null = null,
      birth_day: number | null = null,
      death_year: number | null = null,
      death_month: number | null = null,
      death_day: number | null = null,
      birth_place: string | null = null,
      birth_country: string | null = null
   ) {
      this.id = id
      this.is_male = is_male
      this.firstname = firstname ? cap(firstname) : null
      this.lastname = lastname ? cap(lastname) : null
      this.is_alive = is_alive
      this.birth_year = birth_year
      this.birth_month = birth_month
      this.birth_day = birth_day
      this.death_year = death_year
      this.death_month = death_month
      this.death_day = death_day
      this.birth_place = birth_place
      this.birth_country = birth_country

      this.fullname =
         firstname || lastname
            ? [firstname, lastname].filter(Boolean).join(' ')
            : null
      if (birth_year && death_year)
         this.lifespan = `${birth_year} – ${death_year}`
      else if (birth_year && !death_year) this.lifespan = `${birth_year}`
      else if (!birth_year && death_year) this.lifespan = `– ${death_year}`
      else this.lifespan = null

      Object.freeze(this)
   }

   hasIsMale(): boolean {
      return !isNil(this.is_male)
   }
   hasFirstname(): boolean {
      return Boolean(this.firstname)
   }
   hasLastname(): boolean {
      return Boolean(this.lastname)
   }
   hasFullname(): boolean {
      return Boolean(this.fullname)
   }
   hasIsAlive(): boolean {
      return !isNil(this.is_alive)
   }
   hasBirthYear(): boolean {
      return !isNil(this.birth_year)
   }
   hasBirthMonth(): boolean {
      return !isNil(this.birth_month)
   }
   hasBirthDay(): boolean {
      return !isNil(this.birth_day)
   }
   hasDeathYear(): boolean {
      return !isNil(this.death_year)
   }
   hasDeathMonth(): boolean {
      return !isNil(this.death_month)
   }
   hasDeathDay(): boolean {
      return !isNil(this.death_day)
   }
   hasBirthPlace(): boolean {
      return Boolean(this.birth_place)
   }
   hasBirthCountry(): boolean {
      return Boolean(this.birth_country)
   }
   hasLifespan(): boolean {
      return Boolean(this.lifespan)
   }
   isEmpty(): boolean {
      return (
         !this.hasIsMale() &&
         !this.hasFirstname() &&
         !this.hasLastname() &&
         !this.hasFullname() &&
         !this.hasIsAlive() &&
         !this.hasBirthYear() &&
         !this.hasBirthMonth() &&
         !this.hasBirthDay() &&
         !this.hasDeathYear() &&
         !this.hasDeathMonth() &&
         !this.hasDeathDay() &&
         !this.hasBirthPlace() &&
         !this.hasBirthCountry() &&
         !this.hasLifespan()
      )
   }
}
