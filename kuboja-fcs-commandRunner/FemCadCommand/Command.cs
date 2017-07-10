using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace FemCadCommand
{
    public class Command
    {
        private const string report = "browse_report";

        public string Variable { get; }
        public TypeOutputFunction Type { get; } 

        public string FullCommand(string gclass = "")
        {
            string beforeVariable = "";
            string afterVariable = "";
            switch (Type)
            {
                case TypeOutputFunction.None:
                    break;

                case TypeOutputFunction.Print:
                    beforeVariable = "print";
                    break;

                case TypeOutputFunction.Document:
                    beforeVariable = "browse_report";
                    break;

                case TypeOutputFunction.Json:
                    beforeVariable = "Fcs.Converters.ToJson(";
                    afterVariable = ")";
                    break;

                default:
                    break;
            }

            if (string.IsNullOrEmpty(gclass))
            {
                gclass = "";
            }
            else
            {
                gclass += ".";
            }

            return $"{beforeVariable} {gclass}{Variable} {afterVariable}";
        }

        private static string GetLineFromFile(string filePath, int lineNumber)
        {
            try
            {
                var s = File.ReadAllLines(filePath).ToList();

                if (s.Count >= lineNumber)
                {
                    return s[lineNumber - 1];
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"Nastala chyba při čtení souboru: {e.Message}");
            }

            return "";
        }

        private static string ClearRawCommand(string rawCommand)
        {
            rawCommand = rawCommand.Trim();
            if (rawCommand.StartsWith("browse_report ", StringComparison.InvariantCulture))
            {
                rawCommand = rawCommand.Substring("browse_report".Count());
            }
            if (rawCommand.StartsWith("print ", StringComparison.InvariantCulture))
            {
                rawCommand = rawCommand.Substring("print".Count());
            }
            return rawCommand.Trim();
        }

        private static TypeOutputFunction GetCommandType(string rawCommand)
        {
            if (rawCommand.StartsWith("browse_report", StringComparison.InvariantCulture))
            {
                return TypeOutputFunction.Document;
            }
            if (rawCommand.StartsWith("print", StringComparison.InvariantCulture))
            {
                return TypeOutputFunction.Print;
            }

            return TypeOutputFunction.Json;
        }

        public Command(string scriptFilePath, int lineNumber)
        {
            // načtení vybraného řádku
            string lineText = GetLineFromFile(scriptFilePath, lineNumber);

            // výběr příkazu z řádku
            string rawCommand = "";
            try
            {
                rawCommand = Regex.Match(lineText, @"(?i:\A[#a-z][\w\.\(\)\[\] -[:=]]*)").Value;
            }
            catch (ArgumentException)
            {
                // Syntax error in the regular expression
            }

            rawCommand = rawCommand.TrimStart('#');

            Type = GetCommandType(rawCommand);
            Variable = ClearRawCommand(rawCommand);
        }
    }
}