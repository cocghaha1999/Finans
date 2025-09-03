"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  ReceiptText,
  Hourglass,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button, buttonVariants } from "@/components/ui/button"

const MarkersContext = React.createContext<Record<string, string[]> | null>(null)
type EventItem = { type: string; description?: string }
const EventsContext = React.createContext<Record<string, EventItem[]> | null>(null)

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  markersMap,
  eventsMap,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  markersMap?: Record<string, string[]>
  eventsMap?: Record<string, EventItem[]>
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <MarkersContext.Provider value={markersMap || null}>
      <EventsContext.Provider value={eventsMap || null}>
      <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
    </EventsContext.Provider>
    </MarkersContext.Provider>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const markersCtx = React.useContext(MarkersContext)

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const markers: Array<{ color: string; key: string }> = []
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const keyStr = fmt(day.date)
  const eventsCtx = React.useContext(EventsContext)
  const typesFromCtx = markersCtx?.[keyStr] ?? eventsCtx?.[keyStr]?.map((e) => e.type)
  const has = (name: string) =>
    (Array.isArray(typesFromCtx) && typesFromCtx.includes(name)) || (modifiers as any)[name]
  if (has("expense")) markers.push({ color: "var(--destructive)", key: "expense" })
  if (has("income")) markers.push({ color: "var(--chart-2)", key: "income" })
  if (has("payment")) markers.push({ color: "var(--chart-4)", key: "payment" })
  if (has("card-statement")) markers.push({ color: "var(--chart-5)", key: "card-statement" })
  if (has("card-due")) markers.push({ color: "var(--chart-1)", key: "card-due" })

  const eventList = (eventsCtx?.[keyStr] ?? markers.map((m) => ({ type: m.key, description: undefined })))

  // Türkçe özet: "Kira ödemen var" gibi
  const summary = React.useMemo(() => {
    if (!eventList?.length) return "Bu günde işlem yok"
    const byType: Record<string, EventItem[]> = {}
    for (const e of eventList) {
      if (!byType[e.type]) byType[e.type] = []
      byType[e.type].push(e)
    }
    if (byType["payment"]?.length) {
      const first = byType["payment"][0]
      const name = (first.description || "").split("•")[0].trim()
      if (name) return `${name} ödemen var`
      const c = byType["payment"].length
      return c === 1 ? "Ödemen var" : `${c} ödemen var`
    }
    if (byType["card-due"]?.length) return "Son ödeme günün"
    if (byType["card-statement"]?.length) return "Ekstre kesim günün"
    if (byType["expense"]?.length) return byType["expense"].length === 1 ? "Giderin var" : `${byType["expense"].length} giderin var`
    if (byType["income"]?.length) return byType["income"].length === 1 ? "Gelirin var" : `${byType["income"].length} gelirin var`
    return "Bu günde işlemler var"
  }, [eventList])

  const ButtonNode = (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      title={summary}
      {...props}
    >
      <span className="relative z-[1]">{props.children}</span>
      {markers.length > 0 && (
        <div className="pointer-events-none absolute inset-x-1 z-10">
          {markers.length > 1 ? (
            <>
              {/* üst bant */}
              <div
                className="absolute left-0 right-0 top-1 h-[3px] rounded"
                style={{ background: markers[0].color }}
              />
              {/* alt bant */}
              <div
                className="absolute left-0 right-0 bottom-1 h-[3px] rounded"
                style={{
                  background:
                    markers.length === 2
                      ? markers[1].color
                      : `linear-gradient(to right, ${markers.slice(1).map((m) => m.color).join(",")})`,
                }}
              />
            </>
          ) : (
            <div
              className="absolute left-0 right-0 bottom-1 h-[4px] rounded"
              style={{ background: markers[0].color }}
            />
          )}
          {/* küçük nokta */}
          <div
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: markers[0].color }}
          />
        </div>
      )}
    </Button>
  )

  if (markers.length === 0) return ButtonNode

  return (
    <Tooltip>
      <TooltipTrigger asChild>{ButtonNode}</TooltipTrigger>
      <TooltipContent sideOffset={8} className="px-2 py-1">
        <div className="flex flex-col gap-1.5 max-w-[240px]">
          <div className="text-[11px] font-medium">{summary}</div>
          {eventList.slice(0, 5).map((e, idx) => {
            const Icon =
              e.type === "expense" ? ArrowDownRight :
              e.type === "income" ? ArrowUpRight :
              e.type === "payment" ? CreditCard :
              e.type === "card-statement" ? ReceiptText :
              e.type === "card-due" ? Hourglass :
              null
            const color =
              e.type === "expense" ? "var(--destructive)" :
              e.type === "income" ? "var(--chart-2)" :
              e.type === "payment" ? "var(--chart-4)" :
              e.type === "card-statement" ? "var(--chart-5)" :
              e.type === "card-due" ? "var(--chart-1)" :
              "inherit"
            const fallback =
              e.type === "expense" ? "Gider" :
              e.type === "income" ? "Gelir" :
              e.type === "payment" ? "Ödeme" :
              e.type === "card-statement" ? "Ekstre" :
              e.type === "card-due" ? "Son Ödeme" :
              e.type
            return (
              <div key={idx} className="flex items-center gap-2">
                {Icon ? <Icon className="size-3.5" style={{ color }} /> : <span className="size-3.5" />}
                <span className="truncate text-xs" title={e.description || fallback}>
                  {e.description || fallback}
                </span>
              </div>
            )
          })}
          {eventsCtx?.[keyStr] && eventsCtx[keyStr].length > 5 && (
            <div className="text-[10px] opacity-80">+{eventsCtx[keyStr].length - 5} daha</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export { Calendar, CalendarDayButton }
