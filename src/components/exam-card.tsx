
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, BookOpen, Clock, Hash, Users, Users2, MapPin, X } from "lucide-react";
import { useState, useEffect } from 'react';
import { differenceInDays, parse as parseDateFns } from 'date-fns';
import type { ClientExamEntry } from './exam-ticker-page';

interface ExamCardProps {
  exam: ClientExamEntry;
  onDelete: (id: string) => void;
}

export function ExamCard({ exam, onDelete }: ExamCardProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const calculateDaysLeft = () => {
      if (exam.examDate) {
        try {
          const examDateObj = parseDateFns(exam.examDate, 'dd.MM.yyyy', new Date());
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diff = differenceInDays(examDateObj, today);
          setDaysLeft(diff >= 0 ? diff : 0);
        } catch (e) {
          console.error("Error parsing date in ExamCard:", exam.examDate, e);
          setDaysLeft(0);
        }
      } else {
         setDaysLeft(0);
      }
    };

    calculateDaysLeft();

    intervalId = setInterval(calculateDaysLeft, 1000 * 60 * 60 * 24);

    return () => clearInterval(intervalId);
  }, [exam.examDate]);

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(exam.id)}
        aria-label="Delete exam"
      >
        <X className="h-5 w-5" />
      </Button>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold pr-8">
          <BookOpen className="mr-3 h-6 w-6 text-primary" />
          {exam.courseName}
        </CardTitle>
        <CardDescription className="flex items-center text-sm">
          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
          Exam Date: {exam.examDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-start space-x-2">
          <Clock className="h-8 w-8 text-accent" />
          <div>
            <p className="text-3xl font-bold text-accent">{daysLeft}</p>
            <p className="text-sm text-muted-foreground">days remaining</p>
          </div>
        </div>
        {daysLeft === 0 && (
          <Badge variant="destructive" className="mt-4">Exam is Today!</Badge>
        )}
        {daysLeft > 0 && daysLeft <= 7 && (
          <Badge variant="secondary" className="mt-4">Approaching Soon!</Badge>
        )}

        <div className="mt-6 pt-4 border-t border-border/50">
          <h4 className="text-md font-medium mb-3 text-foreground/80">Exam Details:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <Hash className="mr-2 h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Class Code: </span>
              <span className="font-medium text-foreground/90 ml-1">{exam.classCode}</span>
            </li>
            {exam.group && exam.group !== 'N/A' && (
              <li className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Group: </span>
                <span className="font-medium text-foreground/90 ml-1">{exam.group}</span>
              </li>
            )}
            {exam.examTeam && exam.examTeam !== 'N/A' && (
              <li className="flex items-center">
                <Users2 className="mr-2 h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Exam Team: </span>
                <span className="font-medium text-foreground/90 ml-1">{exam.examTeam}</span>
              </li>
            )}
            {exam.examRoom && exam.examRoom !== 'N/A' && (
              <li className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Exam Room: </span>
                <span className="font-medium text-foreground/90 ml-1">{exam.examRoom}</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
