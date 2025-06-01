"use client";

import type { ExtractExamInfoOutput } from '@/ai/flows/extract-exam-info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, BookOpen, Clock } from "lucide-react";
import { useState, useEffect } from 'react';
import { differenceInDays, parse as parseDateFns } from 'date-fns';

type ExamEntry = ExtractExamInfoOutput[0];

interface ExamCardProps {
  exam: ExamEntry;
}

export function ExamCard({ exam }: ExamCardProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const calculateDaysLeft = () => {
      if (exam.examDate) {
        try {
          const examDateObj = parseDateFns(exam.examDate, 'dd.MM.yyyy', new Date());
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Compare with start of today
          const diff = differenceInDays(examDateObj, today);
          setDaysLeft(diff >= 0 ? diff : 0);
        } catch (e) {
          console.error("Error parsing date:", exam.examDate, e);
          // Fallback to AI provided daysRemaining if parsing fails
          setDaysLeft(exam.daysRemaining >= 0 ? exam.daysRemaining : 0);
        }
      } else {
         setDaysLeft(exam.daysRemaining >= 0 ? exam.daysRemaining : 0);
      }
    };

    calculateDaysLeft(); // Initial calculation
    
    // Update daily
    intervalId = setInterval(calculateDaysLeft, 1000 * 60 * 60 * 24); // Check once a day

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [exam.examDate, exam.daysRemaining]);

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
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
      </CardContent>
    </Card>
  );
}
